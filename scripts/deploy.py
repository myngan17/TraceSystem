from ape import accounts, project

def main():
    acct = accounts.load("test_account")
    print("Using deployer:", acct.address)

    # Deploy token
    token = acct.deploy(project.TraceToken, "Trace Token", "TRACE", 18)
    print("TraceToken deployed at:", token.address)

    # Deploy registry
    reward_units = 100 * (10 ** 18)
    registry = acct.deploy(project.ProvenanceRegistry, token.address, reward_units)
    print("ProvenanceRegistry deployed at:", registry.address)

    # Transfer ownership: pass function args positionally, tx kwargs as keyword
    tx = token.transferOwnership(registry.address, sender=acct)

    # Robust wait: handle TransactionAPI or Receipt
    if hasattr(tx, "wait_for_receipt"):
        receipt = tx.wait_for_receipt()
    else:
        receipt = tx

    # Safe extraction of tx hash (different ape versions use different names)
    txn_hash = getattr(receipt, "txn_hash", None) or getattr(receipt, "tx_hash", None) or getattr(receipt, "transaction_hash", None)
    print("Token ownership transferred to registry. Tx hash:", txn_hash)
