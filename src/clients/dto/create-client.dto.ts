import {
	IsString,
	MinLength,
	MaxLength,
	IsNotEmpty,
	IsOptional,
} from "class-validator";
import { Transform } from "class-transformer";
import {
	IsCEP,
	IsCNPJ,
	IsNumericString,
	IsState,
	SocialReasonIfCNPJ,
	StateInscriptionIfCNPJ,
	CNPJIfSocialReasonOrStateInscription,
} from "@/common/validators";
import { TrimAndSanitize, TrimSanitizeUppercase } from "@/common/sanitizers";

export class CreateClientDto {
	@IsString({ message: "O nome do cliente deve ser uma string." })
	@IsNotEmpty({ message: "O nome do cliente é obrigatório." })
	@MinLength(3, {
		message: "O nome do cliente deve ter pelo menos 3 caracteres.",
	})
	@MaxLength(120, {
		message: "O nome do cliente deve ter no máximo 120 caracteres.",
	})
	@TrimAndSanitize()
	name: string;

	@IsString({ message: "O telefone do cliente deve ser uma string." })
	@IsNotEmpty({ message: "O telefone do cliente é obrigatório." })
	@MinLength(8, {
		message: "O telefone do cliente deve ter pelo menos 8 caracteres.",
	})
	@MaxLength(20, {
		message: "O telefone do cliente deve ter no máximo 20 caracteres.",
	})
	@IsNumericString({
		message: "O telefone deve conter apenas números.",
	})
	@TrimAndSanitize()
	phone: string;

	@IsString({ message: "A cidade do cliente deve ser uma string." })
	@IsNotEmpty({ message: "A cidade do cliente é obrigatória." })
	@TrimAndSanitize()
	city: string;

	@IsString({ message: "O estado do cliente deve ser uma string." })
	@IsNotEmpty({ message: "O estado do cliente é obrigatório." })
	@IsState({ message: "O estado deve conter exatamente 2 caracteres." })
	@TrimSanitizeUppercase()
	state: string;

	@IsString({ message: "O endereço do cliente deve ser uma string." })
	@IsNotEmpty({ message: "O endereço do cliente é obrigatório." })
	@MinLength(3, {
		message: "O endereço deve ter pelo menos 3 caracteres.",
	})
	@MaxLength(200, {
		message: "O endereço deve ter no máximo 200 caracteres.",
	})
	@TrimAndSanitize()
	address: string;

	@IsOptional()
	@IsString({ message: "O CEP deve ser uma string." })
	@IsCEP({ message: "O CEP deve estar no formato 00000-000." })
	@TrimAndSanitize()
	cep?: string;

	@IsOptional()
	@IsString({ message: "O CNPJ deve ser uma string." })
	@IsCNPJ({
		message: "O CNPJ deve ter 14 dígitos ou o formato 00.000.000/0000-00.",
	})
	@CNPJIfSocialReasonOrStateInscription({
		message: "Informe um CNPJ para usar razão social ou inscrição estadual.",
	})
	@TrimAndSanitize()
	cnpj?: string;

	@IsOptional()
	@IsString({ message: "A razão social deve ser uma string." })
	@MinLength(1, { message: "O valor não pode ficar em branco." })
	@MaxLength(120, {
		message: "A razão social deve ter no máximo 120 caracteres.",
	})
	@SocialReasonIfCNPJ({
		message: "A razão social é obrigatória quando o CNPJ for informado.",
	})
	@TrimAndSanitize()
	socialReason?: string;

	@IsOptional()
	@IsString({ message: "A inscrição estadual deve ser uma string." })
	@MinLength(1, { message: "O valor não pode ficar em branco." })
	@MaxLength(40, {
		message: "A inscrição estadual deve ter no máximo 40 caracteres.",
	})
	@StateInscriptionIfCNPJ({
		message: "A inscrição estadual é obrigatória quando o CNPJ for informado.",
	})
	@TrimAndSanitize()
	stateInscription?: string;

	@IsOptional()
	@Transform(({ value }) => value === "true" || value === true)
	needFiscalNote?: boolean;
}
