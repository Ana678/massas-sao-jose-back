import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

interface JwtPayload {
	sub: string;
	email: string;
	role: string;
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
	Strategy,
	"jwt-refresh",
) {
	constructor(configService: ConfigService) {
		const secret = configService.get<string>("JWT_REFRESH_SECRET");
		if (!secret) {
			throw new Error("JWT_REFRESH_SECRET is not defined");
		}
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: secret,
			passReqToCallback: true,
		});
	}

	validate(req: Request, payload: JwtPayload) {
		const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
		return {
			...payload,
			refreshToken,
		};
	}
}
