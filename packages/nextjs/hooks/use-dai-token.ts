import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CPAMM_ADDRESS } from "~~/contracts/cpamm";
import { DAI_TOKEN, ERC20_ABI } from "~~/contracts/tokens";

export default function useDaiToken() {
  const { address } = useAccount();
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: DAI_TOKEN.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address ?? ""],
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: DAI_TOKEN.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address ?? "", CPAMM_ADDRESS],
  });

  const { writeContractAsync } = useWriteContract();

  const approve = (amount: bigint) =>
    writeContractAsync({
      abi: ERC20_ABI,
      address: DAI_TOKEN.address,
      functionName: "approve",
      args: [CPAMM_ADDRESS, amount],
    });

  const refetchAll = () => {
    refetchBalance();
    refetchAllowance();
  };

  return { balance, allowance, refetchBalance, refetchAllowance, approve, refetchAll };
}
