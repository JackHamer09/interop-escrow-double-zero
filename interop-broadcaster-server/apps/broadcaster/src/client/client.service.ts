import { SupportedChainId, supportedChains } from "@app/common/chains";
import { Injectable, Logger } from "@nestjs/common";
import { createPublicClient, http } from "viem";

@Injectable()
export class ClientService {
  private readonly logger: Logger;
  private chainClientByChainId = new Map<SupportedChainId, any>();

  constructor() {
    this.logger = new Logger(ClientService.name);
  }

  public getClient({ chainId}: { chainId: SupportedChainId, }): any {
    const chain = supportedChains.find((chain) => chain.id === chainId);
    if (!chain) throw new Error(`Chain with id ${chainId} not found`);

    if (this.chainClientByChainId.has(chainId)) {
      return this.chainClientByChainId.get(chainId);
    }
    const client = createPublicClient({
      chain,
      transport: http(),
      pollingInterval: 500,
    });
    this.chainClientByChainId.set(chainId, client);
    return client;
  }
}
