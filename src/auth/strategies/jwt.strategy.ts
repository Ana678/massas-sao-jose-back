import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(configService: ConfigService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: configService.get<string>(
				"JWT_SECRET",
				"sua-chave-secreta-super-segura-aqui",
			),
		});
	}

	async validate(payload: any) {
		// O que for retornado aqui será injetado no request (req.user)
		return { userId: payload.sub, email: payload.email, role: payload.role };
	}
}
