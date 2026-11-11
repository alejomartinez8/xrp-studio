import { useSyncExternalStore } from 'react';

/** One answer button of a question. `label` is an i18n key. */
export type AskChoice<T extends string> = { value: T; label: string; primary?: boolean };

/** A question for the user; `title` and `message` are i18n keys, `values` fills them in. */
export type Question<T extends string = string> = {
    title: string;
    message: string;
    values?: Record<string, string>;
    choices: AskChoice<T>[];
};

type Pending = { question: Question; answer: (value: string) => void };

let current: Pending | null = null;
const queue: Pending[] = [];
const listeners = new Set<() => void>();

function notify(): void {
    listeners.forEach((listener) => listener());
}

/**
 * Ask the user a question and wait for the answer (shared device, moving guest
 * projects, signing out with changes not uploaded). Questions asked together are shown one after
 * the other. Rendered by `AskDialog`.
 */
export function ask<T extends string>(question: Question<T>): Promise<T> {
    return new Promise((resolve) => {
        queue.push({ question, answer: (value) => resolve(value as T) });
        if (!current) {
            current = queue.shift()!;
            notify();
        }
    });
}

/** Answer the question on screen. */
export function answer(value: string): void {
    const pending = current;
    current = queue.shift() ?? null;
    notify();
    pending?.answer(value);
}

/** The question on screen, if any. */
export function useQuestion(): Question | null {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => current?.question ?? null,
    );
}
