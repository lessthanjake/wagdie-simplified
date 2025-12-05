import { z } from 'zod';
export declare const CreateCharacterInputSchema: z.ZodObject<{
    name: z.ZodString;
    personality: z.ZodString;
    backstory: z.ZodString;
    systemPrompt: z.ZodOptional<z.ZodString>;
    exampleMessages: z.ZodOptional<z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "user" | "assistant";
        content: string;
    }, {
        role: "user" | "assistant";
        content: string;
    }>, "many">>;
    style: z.ZodOptional<z.ZodObject<{
        all: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        chat: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        post: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        all?: string[] | undefined;
        chat?: string[] | undefined;
        post?: string[] | undefined;
    }, {
        all?: string[] | undefined;
        chat?: string[] | undefined;
        post?: string[] | undefined;
    }>>;
    externalId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    personality: string;
    backstory: string;
    systemPrompt?: string | undefined;
    exampleMessages?: {
        role: "user" | "assistant";
        content: string;
    }[] | undefined;
    style?: {
        all?: string[] | undefined;
        chat?: string[] | undefined;
        post?: string[] | undefined;
    } | undefined;
    externalId?: string | undefined;
}, {
    name: string;
    personality: string;
    backstory: string;
    systemPrompt?: string | undefined;
    exampleMessages?: {
        role: "user" | "assistant";
        content: string;
    }[] | undefined;
    style?: {
        all?: string[] | undefined;
        chat?: string[] | undefined;
        post?: string[] | undefined;
    } | undefined;
    externalId?: string | undefined;
}>;
export declare const UpdateCharacterInputSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    personality: z.ZodOptional<z.ZodString>;
    backstory: z.ZodOptional<z.ZodString>;
    systemPrompt: z.ZodOptional<z.ZodString>;
    exampleMessages: z.ZodOptional<z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "user" | "assistant";
        content: string;
    }, {
        role: "user" | "assistant";
        content: string;
    }>, "many">>;
    style: z.ZodOptional<z.ZodObject<{
        all: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        chat: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        post: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        all?: string[] | undefined;
        chat?: string[] | undefined;
        post?: string[] | undefined;
    }, {
        all?: string[] | undefined;
        chat?: string[] | undefined;
        post?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    personality?: string | undefined;
    backstory?: string | undefined;
    systemPrompt?: string | undefined;
    exampleMessages?: {
        role: "user" | "assistant";
        content: string;
    }[] | undefined;
    style?: {
        all?: string[] | undefined;
        chat?: string[] | undefined;
        post?: string[] | undefined;
    } | undefined;
}, {
    name?: string | undefined;
    personality?: string | undefined;
    backstory?: string | undefined;
    systemPrompt?: string | undefined;
    exampleMessages?: {
        role: "user" | "assistant";
        content: string;
    }[] | undefined;
    style?: {
        all?: string[] | undefined;
        chat?: string[] | undefined;
        post?: string[] | undefined;
    } | undefined;
}>;
export type CreateCharacterInputValidated = z.infer<typeof CreateCharacterInputSchema>;
export type UpdateCharacterInputValidated = z.infer<typeof UpdateCharacterInputSchema>;
export declare function validateCreateCharacter(input: unknown): CreateCharacterInputValidated;
export declare function validateUpdateCharacter(input: unknown): UpdateCharacterInputValidated;
