import { Controller, Body, NotFoundException, Post } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { AnalyticsService, AnalyticsData } from './analytics.service';

class AnalyticsBody {
  @ApiProperty({ description: 'The secret key required to access the analytics data.', example: 'new392' })
  @IsString()
  @IsNotEmpty()
  secret: string;
}

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post()
  async getMetrics(@Body() body: AnalyticsBody): Promise<AnalyticsData> {
    const expectedSecret = 'aspan@tech';
    
    if (body.secret !== expectedSecret) {
      throw new NotFoundException('Analytics resource not found.');
    }

    return this.analyticsService.getAnalyticsData();
  }
}