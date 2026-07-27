import { Controller, Get } from '@nestjs/common';
import { CollegesService } from './colleges.service';

@Controller('colleges')
export class CollegesController {
  constructor(private readonly collegesService: CollegesService) {}

  @Get()
  async getAllColleges() {
    return this.collegesService.getAllColleges();
  }
}
