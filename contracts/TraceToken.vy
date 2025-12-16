# @version ^0.4.3

name: public(String[64])
symbol: public(String[32])
decimals: public(uint256)
total_supply: public(uint256)
owner: public(address)
balances: HashMap[address, uint256]

event Transfer:
    _from: address
    _to: address
    _value: uint256

event OwnershipTransferred:
    previousOwner: address
    newOwner: address

@deploy
def __init__(_name: String[64], _symbol: String[32], _decimals: uint256):
    self.name = _name
    self.symbol = _symbol
    self.decimals = _decimals
    self.owner = msg.sender
    self.total_supply = 0

@external
def mint(to: address, amount: uint256):
    assert msg.sender == self.owner, "Only owner can mint"
    assert to != empty(address), "Invalid address"
    assert amount > 0, "Invalid amount"
    self.balances[to] += amount
    self.total_supply += amount
    # use kwargs for event
    log Transfer(_from=empty(address), _to=to, _value=amount)

@external
def transfer(_to: address, _value: uint256) -> bool:
    assert _value > 0, "Invalid value"
    assert self.balances[msg.sender] >= _value, "Insufficient balance"
    assert _to != empty(address), "Invalid recipient"
    self.balances[msg.sender] -= _value
    self.balances[_to] += _value
    log Transfer(_from=msg.sender, _to=_to, _value=_value)
    return True

@external
@view
def balanceOf(_owner: address) -> uint256:
    return self.balances[_owner]

@external
def transferOwnership(new_owner: address):
    assert msg.sender == self.owner, "Only owner"
    assert new_owner != empty(address), "Invalid new owner"
    assert new_owner != self.owner, "Already owner"
    log OwnershipTransferred(previousOwner=self.owner, newOwner=new_owner)
    self.owner = new_owner
