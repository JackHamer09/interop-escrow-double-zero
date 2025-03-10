import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ERC20_ABI, WAAPL_TOKEN } from "~~/contracts/tokens";
import { TRADE_ESCROW_ADDRESS } from "~~/contracts/trade-escrow";

export default function useWaaplToken() {
  const { address } = useAccount();
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: WAAPL_TOKEN.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address ?? ""],
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: WAAPL_TOKEN.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address ?? "", TRADE_ESCROW_ADDRESS],
  });
  const { data: decimals } = useReadContract({
    address: WAAPL_TOKEN.address,
    abi: ERC20_ABI,
    functionName: "decimals",
  });
  const { data: tokenName } = useReadContract({
    address: WAAPL_TOKEN.address,
    abi: ERC20_ABI,
    functionName: "name",
  });
  const { data: tokenSymbol } = useReadContract({
    address: WAAPL_TOKEN.address,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  const { writeContractAsync } = useWriteContract();

  const approve = (amount: bigint) =>
    writeContractAsync({
      abi: ERC20_ABI,
      address: WAAPL_TOKEN.address,
      functionName: "approve",
      args: [TRADE_ESCROW_ADDRESS, amount],
    });

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
