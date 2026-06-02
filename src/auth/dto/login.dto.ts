import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";
import { TrimAndSanitize } from "@/common/sanitizers";

export class LoginDto {
	@IsEmail()
	@IsNotEmpty()
	@TrimAndSanitize()
	email: string;

	@IsString()
	@IsNotEmpty()
	@MinLength(6)
	@TrimAndSanitize()
	password: string;
}
