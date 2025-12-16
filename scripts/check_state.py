# scripts/check_state.py
from ape import project

def main():
    token = project.TraceToken.at("0x937275Ab119E6F905D745817C1Df9bf7AD5d785f")
    registry = project.ProvenanceRegistry.at("0x4929188f5C7f4520ef138fCa1419A551F3f31D0B")

    print("token.address:", token.address)
    print("registry.address:", registry.address)

    print("token owner:", token.owner())
    print("registry.token():", registry.token())

    print("token total_supply:", token.total_supply())
    print("balanceOf registry:", token.balanceOf(registry.address))
