import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ERC20_ABI, USDG_TOKEN } from "~~/contracts/tokens";
import { TRADE_ESCROW_ADDRESS } from "~~/contracts/trade-escrow";
import { chain1 } from "~~/services/web3/wagmiConfig";

export default function useUsdgToken() {
  const { address, chainId } = useAccount();
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: chainId === chain1.id ? USDG_TOKEN.address : USDG_TOKEN.address_chain2,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address ?? ""],
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: chainId === chain1.id ? USDG_TOKEN.address : USDG_TOKEN.address_chain2,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address ?? "", TRADE_ESCROW_ADDRESS],
  });
  const { data: decimals } = useReadContract({
    address: chainId === chain1.id ? USDG_TOKEN.address : USDG_TOKEN.address_chain2,
    abi: ERC20_ABI,
    functionName: "decimals",
  });
  const { data: tokenName } = useReadContract({
    address: chainId === chain1.id ? USDG_TOKEN.address : USDG_TOKEN.address_chain2,
    abi: ERC20_ABI,
    functionName: "name",
  });
  const { data: tokenSymbol } = useReadContract({
    address: chainId === chain1.id ? USDG_TOKEN.address : USDG_TOKEN.address_chain2,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  const { writeContractAsync } = useWriteContract();

  const approve = (amount: bigint) => {
    if (chainId !== chain1.id) throw new Error(`Switch to ${chain1.name} to approve ${tokenSymbol || 'USDG'}`);
    return writeContractAsync({
      abi: ERC20_ABI,
      address: USDG_TOKEN.address,
      functionName: "approve",
      args: [TRADE_ESCROW_ADDRESS, amount],
    });
  }

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
