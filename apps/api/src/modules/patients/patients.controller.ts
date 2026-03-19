import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { PatientsService } from "./patients.service";

@UseGuards(AuthGuard)
@Controller("patients")
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  list() {
    return this.patientsService.list();
  }

  @Post()
  create(@Body() input: any) {
    return this.patientsService.create(input);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.patientsService.getById(id);
  }
}
