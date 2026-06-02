import type { ValidationArguments, ValidationOptions } from "class-validator";
import {
	registerDecorator,
	ValidatorConstraint,
	ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "IsCEP", async: false })
export class IsCEPConstraint implements ValidatorConstraintInterface {
	validate(value: string) {
		if (!value) return true;
		const cepRegex = /^\d{5}-?\d{3}$/;
		return cepRegex.test(value);
	}

	defaultMessage() {
		return "O CEP deve estar no formato 00000-000.";
	}
}

@ValidatorConstraint({ name: "IsCNPJ", async: false })
export class IsCNPJConstraint implements ValidatorConstraintInterface {
	validate(value: string) {
		if (!value) return true;
		const cnpjRegex = /^\d{14}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
		return cnpjRegex.test(value);
	}

	defaultMessage() {
		return "O CNPJ deve ter 14 dígitos ou o formato 00.000.000/0000-00.";
	}
}

@ValidatorConstraint({ name: "IsNumericString", async: false })
export class IsNumericStringConstraint implements ValidatorConstraintInterface {
	validate(value: string) {
		if (!value) return true;
		return /^\d+$/.test(value);
	}

	defaultMessage() {
		return "O telefone deve conter apenas números.";
	}
}

@ValidatorConstraint({ name: "IsStateFallback", async: false })
export class IsStateConstraint implements ValidatorConstraintInterface {
	validate(value: string) {
		if (!value) return false;
		return value.length === 2;
	}

	defaultMessage() {
		return "O estado deve conter exatamente 2 caracteres.";
	}
}

@ValidatorConstraint({ name: "SocialReasonIfCNPJ", async: false })
export class SocialReasonIfCNPJConstraint
	implements ValidatorConstraintInterface
{
	validate(value: string, args: ValidationArguments) {
		const object = args.object as Record<string, unknown>;
		if (object.cnpj && !value) {
			return false;
		}
		return true;
	}

	defaultMessage() {
		return "A razão social é obrigatória quando o CNPJ for informado.";
	}
}

@ValidatorConstraint({ name: "StateInscriptionIfCNPJ", async: false })
export class StateInscriptionIfCNPJConstraint
	implements ValidatorConstraintInterface
{
	validate(value: string, args: ValidationArguments) {
		const object = args.object as Record<string, unknown>;
		if (object.cnpj && !value) {
			return false;
		}
		return true;
	}

	defaultMessage() {
		return "A inscrição estadual é obrigatória quando o CNPJ for informado.";
	}
}

@ValidatorConstraint({
	name: "CNPJIfSocialReasonOrStateInscription",
	async: false,
})
export class CNPJIfSocialReasonOrStateInscriptionConstraint
	implements ValidatorConstraintInterface
{
	validate(value: string, args: ValidationArguments) {
		const object = args.object as Record<string, unknown>;
		if ((object.socialReason || object.stateInscription) && !value) {
			return false;
		}
		return true;
	}

	defaultMessage() {
		return "Informe um CNPJ para usar razão social ou inscrição estadual.";
	}
}

export function IsCEP(validationOptions?: ValidationOptions) {
	return (target: object, propertyName: string) => {
		registerDecorator({
			target: target.constructor,
			propertyName: propertyName,
			options: validationOptions,
			constraints: [],
			validator: IsCEPConstraint,
		});
	};
}

export function IsCNPJ(validationOptions?: ValidationOptions) {
	return (target: object, propertyName: string) => {
		registerDecorator({
			target: target.constructor,
			propertyName: propertyName,
			options: validationOptions,
			constraints: [],
			validator: IsCNPJConstraint,
		});
	};
}

export function IsNumericString(validationOptions?: ValidationOptions) {
	return (target: object, propertyName: string) => {
		registerDecorator({
			target: target.constructor,
			propertyName: propertyName,
			options: validationOptions,
			constraints: [],
			validator: IsNumericStringConstraint,
		});
	};
}

export function IsState(validationOptions?: ValidationOptions) {
	return (target: object, propertyName: string) => {
		registerDecorator({
			target: target.constructor,
			propertyName: propertyName,
			options: validationOptions,
			constraints: [],
			validator: IsStateConstraint,
		});
	};
}

export function SocialReasonIfCNPJ(validationOptions?: ValidationOptions) {
	return (target: object, propertyName: string) => {
		registerDecorator({
			target: target.constructor,
			propertyName: propertyName,
			options: validationOptions,
			constraints: [],
			validator: SocialReasonIfCNPJConstraint,
		});
	};
}

export function StateInscriptionIfCNPJ(validationOptions?: ValidationOptions) {
	return (target: object, propertyName: string) => {
		registerDecorator({
			target: target.constructor,
			propertyName: propertyName,
			options: validationOptions,
			constraints: [],
			validator: StateInscriptionIfCNPJConstraint,
		});
	};
}

export function CNPJIfSocialReasonOrStateInscription(
	validationOptions?: ValidationOptions,
) {
	return (target: object, propertyName: string) => {
		registerDecorator({
			target: target.constructor,
			propertyName: propertyName,
			options: validationOptions,
			constraints: [],
			validator: CNPJIfSocialReasonOrStateInscriptionConstraint,
		});
	};
}

@ValidatorConstraint({ name: "IsEmailStrict", async: false })
export class IsEmailStrictConstraint implements ValidatorConstraintInterface {
	validate(value: string) {
		if (!value) return true;
		const emailRegex =
			/^[^\s@]+@[^\s@]+\.[^\s@]+$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		return emailRegex.test(value);
	}

	defaultMessage() {
		return "O email deve ser válido.";
	}
}

@ValidatorConstraint({ name: "IsURLStrict", async: false })
export class IsURLStrictConstraint implements ValidatorConstraintInterface {
	validate(value: string) {
		if (!value) return true;
		try {
			new URL(value);
			return true;
		} catch {
			return false;
		}
	}

	defaultMessage() {
		return "A URL deve ser válida e começar com http:// ou https://.";
	}
}

export function IsEmailStrict(validationOptions?: ValidationOptions) {
	return (target: object, propertyName: string) => {
		registerDecorator({
			target: target.constructor,
			propertyName: propertyName,
			options: validationOptions,
			constraints: [],
			validator: IsEmailStrictConstraint,
		});
	};
}

export function IsURLStrict(validationOptions?: ValidationOptions) {
	return (target: object, propertyName: string) => {
		registerDecorator({
			target: target.constructor,
			propertyName: propertyName,
			options: validationOptions,
			constraints: [],
			validator: IsURLStrictConstraint,
		});
	};
}
