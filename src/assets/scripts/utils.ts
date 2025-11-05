export const loadImage = (obj: HTMLImageElement) => {
    return new Promise((resolve, reject) => {
        obj.onload = () => resolve(obj);
        obj.onerror = reject;
    });
}

export const slugify = (input: string): string => {
    if (!input)
        return '';

    // make lower case and trim
    var slug = input.toLowerCase().trim();

    // remove accents from charaters
    slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // replace invalid chars with spaces
    slug = slug.replace(/[^a-z0-9\s-]/g, ' ').trim();

    // replace multiple spaces or hyphens with a single hyphen
    slug = slug.replace(/[\s-]+/g, '-');

    return slug;
}

export const cancellableSleep = (duration: number, signal: AbortSignal) => {
    return new Promise<void>((resolve, reject) => {
        signal.throwIfAborted();

        const timeout = setTimeout(() => {
            resolve();
            signal.removeEventListener('abort', abort);
        }, duration);

        const abort = () => {
            clearTimeout(timeout);
            reject(signal.reason);
        }

        signal.addEventListener('abort', abort);
    });
}
