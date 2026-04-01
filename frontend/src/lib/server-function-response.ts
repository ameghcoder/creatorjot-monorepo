// utils/api-response.ts

export type ResponseServerFuncType<T> = {
    success: boolean;
    message: string;
    status?: number;
    data?: T | null;
}
export function successResponseServerFunc<T>({ message, status = 200, data }: Omit<ResponseServerFuncType<T>, "success">): ResponseServerFuncType<T> {
    return {
        success: true,
        message,
        data,
        status
    };
}

export function errorResponseServerFunc({ message, status = 500 }: Omit<ResponseServerFuncType<null>, "success" | "data">): ResponseServerFuncType<null> {
    return {
        success: false,
        message,
        status,
        data: null
    };
}
