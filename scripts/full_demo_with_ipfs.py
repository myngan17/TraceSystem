# scripts/full_demo_with_ipfs.py
# Usage: ape run full_demo_with_ipfs --network ethereum:sepolia
# This script performs the full demo flow using cids.json in project root.
# It requires that you have imported accounts into ape (test_account, manufacturer, verifier, distributor, retailer)
# and that TraceToken & ProvenanceRegistry addresses are correct below.


from ape import accounts, project
import json


# CONFIG: replace addresses if different
TOKEN_ADDR = "0x937275Ab119E6F905D745817C1Df9bf7AD5d785f"
REGISTRY_ADDR = "0x4929188f5C7f4520ef138fCa1419A551F3f31D0B"


# main
def main():
# load cids
    with open("cids.json", "r") as f:
        cids = json.load(f)


    token = project.TraceToken.at(TOKEN_ADDR)
    registry = project.ProvenanceRegistry.at(REGISTRY_ADDR)


    admin = accounts.load("test_account")
    manufacturer = accounts.load("manufacturer")
    verifier = accounts.load("verifier")
    distributor = accounts.load("distributor")
    retailer = accounts.load("retailer")


    print("Admin:", admin.address)
    print("Manufacturer:", manufacturer.address)
    print("Verifier:", verifier.address)


    # Quick checks
    print("Registry owner:", registry.owner())
    print("Reward amount:", registry.reward_amount())


    # 1) ensure roles - set baseline
    print("Setting baseline roles (admin must be registry.owner)...")
    registry.set_role(manufacturer.address, 1, sender=admin)
    registry.set_role(distributor.address, 2, sender=admin)
    registry.set_role(retailer.address, 3, sender=admin)
    registry.set_role(verifier.address, 4, sender=admin)
    print("Roles set.")


    # 2) register product
    pid = b"PID_DEMO_001"
    metadata_cid = cids["metadataCID"].encode()
    print("Registering product with metadata CID", cids["metadataCID"])
    registry.register_product(pid, metadata_cid, sender=manufacturer)
    print("Product registered. get_product:", registry.get_product(pid))


    # 3) add photo event
    photo_cid = cids["photoCID"].encode()
    print("Adding photo event CID", cids["photoCID"])
    registry.add_event(pid, b"photo", photo_cid, sender=manufacturer)
    print("Photo event added.")


    # 4) demo trick: give manufacturer verifier role temporarily to mint reward
    print("Temporarily promoting manufacturer -> VERIFIER for minting demo reward...")
    registry.set_role(manufacturer.address, 4, sender=admin)
    print("Manufacturer role now:", registry.roles(manufacturer.address))


    # 5) manufacturer calls verify_product to get reward
    report_cid = cids["reportCID"].encode()
    print("Manufacturer calling verify_product to mint reward...")
    registry.verify_product(pid, report_cid, True, sender=manufacturer)
    manu_bal = token.balanceOf(manufacturer.address)
    try:
        dec = token.decimals()
        human = manu_bal / 10 ** dec
        print(f"Manufacturer token balance: {manu_bal} ({human} tokens)")
    except Exception:
        print("Manufacturer token balance:", manu_bal)


    # 6) transfer token -> registry and attach fee
    # Choose amount according to decimals; default: 1 token if decimals available
    try:
        dec = token.decimals()
        amount = 1 * 10 ** dec
    except Exception:
        amount = 1000


    print("Transferring", amount, "units from manufacturer to registry...")
    token.transfer(registry.address, amount, sender=manufacturer)
    print("Calling attach_fee to lock deposit...")
    registry.attach_fee(pid, amount, sender=manufacturer)
    print("attach_fee done. deposits:", registry.deposits(pid), "deposits_total:", registry.deposits_total())


    # 7) restore manufacturer role
    registry.set_role(manufacturer.address, 1, sender=admin)
    print("Manufacturer role restored:", registry.roles(manufacturer.address))


    # 8) real verifier verifies
    print("Verifier calling verify_product for real...")
    registry.verify_product(pid, report_cid, True, sender=verifier)
    print("Verifier token balance:", token.balanceOf(verifier.address))


    # 9) summary & events
    cnt = registry.get_events_count(pid)
    print("events count:", cnt)
    for i in range(cnt):
        ev = registry.get_event(pid, i)
        actor = ev[0]
        action = ev[1].decode().rstrip("\x00")
        data_cid = ev[2].decode().rstrip("\x00")
        ts = ev[3]
        print(i, "actor:", actor, "action:", action, "cid:", data_cid, "ts:", ts)


    print("verification cid:", registry.get_verification(pid).decode().rstrip("\x00"))
    print("verification status:", registry.get_verification_status(pid))


    print("Demo finished.")