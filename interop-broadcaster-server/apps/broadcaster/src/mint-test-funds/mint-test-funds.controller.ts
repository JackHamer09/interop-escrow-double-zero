import { Controller, HttpException, HttpStatus, Logger, Post, Get, Query } from '@nestjs/common';
import { MintTestFundsService } from './mint-test-funds.service';
import { isAddress } from 'viem';

// No '/api' prefix needed as it's added globally in main.ts
@Controller('mint-test-funds')
export class MintTestFundsController {
  private readonly logger: Logger;

  constructor(private readonly mintTestFundsService: MintTestFundsService) {
    this.logger = new Logger(MintTestFundsController.name);
  }

  @Post()
  async mintTestFunds(@Query('address') address: string): Promise<{ success: boolean }> {
    this.logger.log(`Received mint request for address: ${address}`);
    
    try {
      if (!address) {
        this.logger.error('No address provided in request');
        throw new HttpException('Address is required', HttpStatus.BAD_REQUEST);
      }
      
      // Validate the address format
      if (!isAddress(address)) {
        this.logger.error(`Invalid Ethereum address: ${address}`);
        throw new HttpException('Invalid Ethereum address', HttpStatus.BAD_REQUEST);
      }

      await this.mintTestFundsService.mintFunds(address);
      this.logger.log(`Successfully minted funds for ${address}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to mint test funds: ${error.message}`);
      throw new HttpException('Failed to mint test funds', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}