import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ERC20_ABI, TTBILL_TOKEN } from "~~/contracts/tokens";
import { TRADE_ESCROW_ADDRESS } from "~~/contracts/trade-escrow";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";

export default function useTtbillToken() {
  const { address, chainId } = useAccount();
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: chainId === chain2.id ? TTBILL_TOKEN.address_chain2 : TTBILL_TOKEN.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address ?? ""],
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: chainId === chain2.id ? TTBILL_TOKEN.address_chain2 : TTBILL_TOKEN.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address ?? "", TRADE_ESCROW_ADDRESS],
  });
  const { data: decimals } = useReadContract({
    address: chainId === chain2.id ? TTBILL_TOKEN.address_chain2 : TTBILL_TOKEN.address,
    abi: ERC20_ABI,
    functionName: "decimals",
  });
  const { data: tokenName } = useReadContract({
    address: chainId === chain2.id ? TTBILL_TOKEN.address_chain2 : TTBILL_TOKEN.address,
    abi: ERC20_ABI,
    functionName: "name",
  });
  const { data: tokenSymbol } = useReadContract({
    address: chainId === chain2.id ? TTBILL_TOKEN.address_chain2 : TTBILL_TOKEN.address,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  const { writeContractAsync } = useWriteContract();
  const approve = (amount: bigint) => {
    if (chainId !== chain1.id) throw new Error(`Switch to ${chain1.name} to approve ${tokenSymbol || "TTBILL"}`);
    return writeContractAsync({
      abi: ERC20_ABI,
      address: TTBILL_TOKEN.address,
      functionName: "approve",
      args: [TRADE_ESCROW_ADDRESS, amount],
    });
  };

  const refetchAll = () => {
    refetchBalance();
    refetchAllowance();
  };

  return {
    balance,
    allowance,
    decimals,
    tokenName,
    tokenSymbol,
    refetchBalance,
    refetchAllowance,
    approve,
    refetchAll,
  };
}
