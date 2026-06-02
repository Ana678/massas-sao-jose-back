import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

interface JwtPayload {
	sub: string;
	email: string;
	role: string;
}

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, "jwt") {
	constructor(configService: ConfigService) {
		const secret = configService.get<string>("JWT_ACCESS_SECRET");
		if (!secret) {
			throw new Error("JWT_ACCESS_SECRET is not defined");
		}
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: secret,
		});
	}

	validate(payload: JwtPayload): JwtPayload {
		return payload;
	}
}
