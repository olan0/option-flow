import { describe, it, expect } from "vitest";
import { initSimnet } from "@hirosystems/clarinet-sdk";
import { Cl } from '@stacks/transactions';

describe("Options AMM Contract Flow", async () => {
   const chain = await initSimnet();

    const accounts = chain.getAccounts();
    const deployer = accounts.get('deployer');
    const wallet1 = accounts.get('wallet_1');
  it("should create a pool, add liquidity, and buy option", () => {
  
    if (!deployer) throw new Error("Deployer account not found");
    if (!wallet1) throw new Error("wallet_1 account not found");
    

    // contract principal
    const ammContract = "options-amm";

    // ---- 1. Create Pool ----
    const createResult = chain.callPublicFn(
      ammContract,
      "create-pool",
      [
        Cl.stringAscii("POOL1"),    // pool-id
        Cl.stringAscii("AEUSDC"),   // underlying asset
        Cl.uint(1000),              // strike-price
        Cl.uint(10000),             // expiration-timestamp
        Cl.stringAscii("call"),     // option-type
        Cl.uint(1000000),           // initial liquidity
        Cl.uint(7500),              // implied volatility
        Cl.principal(deployer) // token-contract (placeholder for now)
      ],
      deployer
    );

    expect(createResult.result).toBe('ok');

    // ---- 2. Add Liquidity ----
    const addResult = chain.callPublicFn(
      ammContract,
      "add-liquidity",
      [
        Cl.stringAscii("POOL1"),
        Cl.uint(500000),
        Cl.principal(deployer)   // token-contract
      ],
      wallet1
    );

    expect(addResult.result).toBe('ok');

    // ---- 3. Buy Option ----
    const buyResult = chain.callPublicFn(
      ammContract,
      "buy-option",
      [
        Cl.stringAscii("POOL1"),
        Cl.uint(10),        // quantity
        Cl.uint(1000000),   // max cost
        Cl.uint(1200),      // oracle price
        Cl.principal(deployer)   // token-contract
      ],
      wallet1
    );

    console.log("Buy Option Result:", buyResult);
    expect(buyResult.result).toBe('ok');
  });
});
