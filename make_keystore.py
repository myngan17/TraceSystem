from eth_account import Account
import json

private_key = "0xe41aa106bfa997b17981a1a10370e094660fc7e64f14bb279fe116696fdce347"
password = "5hx7mt6l"  # đặt mật khẩu bạn muốn

acct = Account.from_key(private_key)
keystore_json = Account.encrypt(private_key, password)

filename = f"UTC--{acct.address}.json"
with open(filename, "w") as f:
    json.dump(keystore_json, f)

print("Wrote keystore:", filename)
print("Address:", acct.address)
