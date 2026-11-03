export function isFileUri(value: string): boolean {
  try {
    const uri = new URL(value);
    return value.startsWith('file://') && uri.protocol === 'file:'
      && uri.pathname.startsWith('/') && uri.search === '' && uri.hash === '';
  } catch {
    return false;
  }
}
