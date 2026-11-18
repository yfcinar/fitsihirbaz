import { Module } from "@nestjs/common";
import { ShowcaseService } from "./showcase.service";

@Module({
  providers: [ShowcaseService],
  exports: [ShowcaseService],
})
export class ShowcaseModule {}
