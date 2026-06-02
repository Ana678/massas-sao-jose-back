import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { DRIZZLE_DB } from "../database/database.module";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
	constructor(
		@Inject(DRIZZLE_DB) private db: NodePgDatabase<typeof schema>,
		private jwtService: JwtService,
		private configService: ConfigService,
	) {}

	async getTokens(userId: string, email: string, role: string) {
		const [accessToken, refreshToken] = await Promise.all([
			this.jwtService.signAsync(
				{ sub: userId, email, role },
				{
					secret: this.configService.get<string>("JWT_ACCESS_SECRET"),
					expiresIn: "15m",
				},
			),
			this.jwtService.signAsync(
				{ sub: userId, email, role },
				{
					secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
					expiresIn: "7d",
				},
			),
		]);
		return { accessToken, refreshToken };
	}

	async updateRefreshToken(userId: string, refreshToken: string) {
		const hash = await bcrypt.hash(refreshToken, 10);
		await this.db
			.update(schema.users)
			.set({ refreshToken: hash })
			.where(eq(schema.users.id, userId));
	}

	async login(email: string, pass: string) {
		const [user] = await this.db
			.select()
			.from(schema.users)
			.where(eq(schema.users.email, email));

		if (!user || !(await bcrypt.compare(pass, user.passwordHash))) {
			throw new UnauthorizedException("Credenciais inválidas.");
		}

		const tokens = await this.getTokens(user.id, user.email, user.role);
		await this.updateRefreshToken(user.id, tokens.refreshToken);

		return {
			...tokens,
			user: { id: user.id, name: user.name, role: user.role },
		};
	}

	async refreshTokens(userId: string, rt: string) {
		const [user] = await this.db
			.select()
			.from(schema.users)
			.where(eq(schema.users.id, userId));

		if (!user?.refreshToken) throw new UnauthorizedException("Acesso negado");

		const rtMatches = await bcrypt.compare(rt, user.refreshToken);
		if (!rtMatches) throw new UnauthorizedException("Acesso negado");

		const tokens = await this.getTokens(user.id, user.email, user.role);
		await this.updateRefreshToken(user.id, tokens.refreshToken);

		return tokens;
	}
}
