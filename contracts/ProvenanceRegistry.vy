# @version ^0.4.3

MAX_EVENTS: constant(uint256) = 1024
MAX_RANGE: constant(uint256) = 100  # max events to fetch in one call

MANUFACTURER: constant(uint256) = 1
DISTRIBUTOR: constant(uint256) = 2
RETAILER: constant(uint256) = 3
VERIFIER: constant(uint256) = 4

interface IToken:
    def mint(to: address, amount: uint256): nonpayable
    def transfer(_to: address, _value: uint256) -> bool: nonpayable
    def balanceOf(_owner: address) -> uint256: view
    def transferOwnership(new_owner: address): nonpayable

struct Product:
    exists: bool
    owner: address
    metadata_cid: Bytes[128]
    events_count: uint256

struct EventLog:
    actor: address
    action: bytes32
    data_cid: Bytes[128]
    timestamp: uint256

owner: public(address)
roles: public(HashMap[address, uint256])
products: public(HashMap[bytes32, Product])

events: HashMap[bytes32, HashMap[uint256, EventLog]]
verifications: public(HashMap[bytes32, Bytes[128]])
verification_status: public(HashMap[bytes32, uint256])  # 0 none, 1 passed, 2 failed

token: public(address)
reward_amount: public(uint256)
deposits: public(HashMap[bytes32, uint256])
deposits_total: public(uint256)

# Events
event ProductRegistered:
    product_id: bytes32
    owner: address
    metadata_cid: Bytes[128]

event OwnershipTransferred:
    product_id: bytes32
    old_owner: address
    new_owner: address

event EventAdded:
    product_id: bytes32
    index: uint256
    actor: address
    action: bytes32
    data_cid: Bytes[128]

event Verified:
    product_id: bytes32
    verifier: address
    report_cid: Bytes[128]
    reward: uint256
    fee_paid: uint256
    passed: bool

event FeeAttached:
    product_id: bytes32
    payer: address
    amount: uint256

event DepositWithdrawn:
    product_id: bytes32
    to: address
    amount: uint256

event MetadataUpdated:
    product_id: bytes32
    old_cid: Bytes[128]
    new_cid: Bytes[128]

event RoleRevoked:
    addr: address
    old_role: uint256

# Constructor
@deploy
def __init__(_token: address, _reward_amount: uint256):
    self.owner = msg.sender
    self.roles[msg.sender] = MANUFACTURER
    self.token = _token
    self.reward_amount = _reward_amount
    self.deposits_total = 0

# Admin / config
@external
def set_token(_token: address):
    assert msg.sender == self.owner, "Not owner"
    self.token = _token

@external
def set_reward_amount(_amt: uint256):
    assert msg.sender == self.owner, "Not owner"
    self.reward_amount = _amt

# Roles
@external
def set_role(addr: address, r: uint256):
    assert msg.sender == self.owner, "Not owner"
    self.roles[addr] = r

@external
def revoke_role(addr: address):
    assert msg.sender == self.owner, "Not owner"
    old_role: uint256 = self.roles[addr]
    self.roles[addr] = 0
    log RoleRevoked(addr=addr, old_role=old_role)

# Product lifecycle
@external
def register_product(pid: bytes32, metadata_cid: Bytes[128]):
    r: uint256 = self.roles[msg.sender]
    assert r == MANUFACTURER or r == DISTRIBUTOR, "Not allowed"
    assert not self.products[pid].exists, "Product exists"
    # Use kwargs to instantiate struct (required in v0.4.x)
    prod: Product = Product(exists=True, owner=msg.sender, metadata_cid=metadata_cid, events_count=0)
    self.products[pid] = prod
    log ProductRegistered(product_id=pid, owner=msg.sender, metadata_cid=metadata_cid)

@external
def transfer_product(pid: bytes32, to: address):
    prod: Product = self.products[pid]
    assert prod.exists, "No product"
    assert prod.owner == msg.sender, "Not owner"
    old_owner: address = prod.owner
    prod.owner = to
    self.products[pid] = prod
    log OwnershipTransferred(product_id=pid, old_owner=old_owner, new_owner=to)

@external
def update_metadata(pid: bytes32, new_cid: Bytes[128]):
    prod: Product = self.products[pid]
    assert prod.exists, "No product"
    assert prod.owner == msg.sender, "Not owner"
    old: Bytes[128] = prod.metadata_cid
    prod.metadata_cid = new_cid
    self.products[pid] = prod
    log MetadataUpdated(product_id=pid, old_cid=old, new_cid=new_cid)

@external
def add_event(pid: bytes32, action: bytes32, data_cid: Bytes[128]):
    prod: Product = self.products[pid]
    assert prod.exists, "No product"
    allowed: bool = False
    if prod.owner == msg.sender:
        allowed = True
    else:
        role: uint256 = self.roles[msg.sender]
        if role == DISTRIBUTOR or role == RETAILER or role == MANUFACTURER:
            allowed = True
    assert allowed, "Not allowed"
    idx: uint256 = prod.events_count
    assert idx < MAX_EVENTS, "Max events reached"
    # Use kwargs to instantiate EventLog
    ev: EventLog = EventLog(actor=msg.sender, action=action, data_cid=data_cid, timestamp=block.timestamp)
    self.events[pid][idx] = ev
    prod.events_count = idx + 1
    self.products[pid] = prod
    log EventAdded(product_id=pid, index=idx, actor=msg.sender, action=action, data_cid=data_cid)

# Deposit
@external
def attach_fee(pid: bytes32, amount: uint256):
    prod: Product = self.products[pid]
    assert prod.exists, "No product"
    assert prod.owner == msg.sender, "Only product owner can attach fee"
    assert amount > 0, "Invalid amount"
    # NOTE: This function assumes the registry already holds sufficient token balance.
    self.deposits[pid] += amount
    self.deposits_total += amount
    # use staticcall for view calls
    bal: uint256 = staticcall IToken(self.token).balanceOf(self)
    assert bal >= self.deposits_total, "Registry token balance insufficient (transfer to registry first)"
    log FeeAttached(product_id=pid, payer=msg.sender, amount=amount)

# Withdraw deposit (owner can withdraw remaining deposit)
@external
def withdraw_deposit(pid: bytes32, amount: uint256):
    prod: Product = self.products[pid]
    assert prod.exists, "No product"
    assert prod.owner == msg.sender, "Only product owner can withdraw"
    assert amount > 0 and self.deposits[pid] >= amount, "Invalid amount"
    self.deposits[pid] -= amount
    self.deposits_total -= amount
    # extcall for external nonpayable function
    success: bool = extcall IToken(self.token).transfer(msg.sender, amount)
    assert success, "Token transfer failed"
    log DepositWithdrawn(product_id=pid, to=msg.sender, amount=amount)

# Verification with pass/fail
@external
def verify_product(pid: bytes32, report_cid: Bytes[128], passed: bool):
    prod: Product = self.products[pid]
    assert prod.exists, "No product"
    assert self.roles[msg.sender] == VERIFIER, "Not verifier"

    fee_paid: uint256 = self.deposits[pid]
    reward: uint256 = self.reward_amount

    # clear deposit before external calls to avoid reentrancy-like issues
    if fee_paid > 0:
        self.deposits[pid] = 0
        self.deposits_total -= fee_paid

    if passed:
        # transfer fee to verifier
        if fee_paid > 0:
            success: bool = extcall IToken(self.token).transfer(msg.sender, fee_paid)
            assert success, "Fee transfer failed"
        # mint reward (registry must be token owner/minter)
        if reward > 0:
            # mint may not return bool — ignore return value
            extcall IToken(self.token).mint(msg.sender, reward)
        self.verification_status[pid] = 1
    else:
        # refund deposit back to product owner
        if fee_paid > 0:
            success: bool = extcall IToken(self.token).transfer(prod.owner, fee_paid)
            assert success, "Refund transfer failed"
        self.verification_status[pid] = 2

    self.verifications[pid] = report_cid
    log Verified(product_id=pid, verifier=msg.sender, report_cid=report_cid, reward=(reward if passed else 0), fee_paid=fee_paid, passed=passed)

# Views
@external
@view
def get_product(pid: bytes32) -> (bool, address, Bytes[128], uint256):
    p: Product = self.products[pid]
    return (p.exists, p.owner, p.metadata_cid, p.events_count)

@external
@view
def get_events_count(pid: bytes32) -> uint256:
    return self.products[pid].events_count

@external
@view
def get_event(pid: bytes32, idx: uint256) -> (address, bytes32, Bytes[128], uint256):
    ev: EventLog = self.events[pid][idx]
    return (ev.actor, ev.action, ev.data_cid, ev.timestamp)

# Get a range of events [start, end) with a maximum of MAX_RANGE items.
# Returns arrays and actual length 'returned'
@external
@view
def get_events_range(pid: bytes32, start: uint256, end: uint256) -> (uint256[MAX_RANGE], uint256):
    total: uint256 = self.products[pid].events_count
    assert start <= end and end <= total, "Invalid range"
    length: uint256 = end - start
    assert length <= MAX_RANGE, "Range too large"

    idxs: uint256[MAX_RANGE] = empty(uint256[MAX_RANGE])

    # must declare type for loop variable
    for i: uint256 in range(MAX_RANGE):
        idx: uint256 = start + i
        if idx < end:
            idxs[i] = idx

    return idxs, length

@external
@view
def get_verification(pid: bytes32) -> Bytes[128]:
    return self.verifications[pid]

@external
@view
def get_verification_status(pid: bytes32) -> uint256:
    # 0 none, 1 passed, 2 failed
    return self.verification_status[pid]
