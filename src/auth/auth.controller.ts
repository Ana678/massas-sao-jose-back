import { Controller, Post, Body, UseGuards, Req } from "@nestjs/common";
import { type Request } from "express";
import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post("login")
	login(@Body() body: LoginDto) {
		return this.authService.login(body.email, body.password);
	}

	@UseGuards(AuthGuard("jwt-refresh"))
	@Post("refresh")
	refreshTokens(@Req() req: Request) {
		return this.authService.refreshTokens(
			req.user?.["sub"],
			req.user?.["refreshToken"],
		);
	}
}
