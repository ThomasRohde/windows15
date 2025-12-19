/**
 * Apps barrel exports
 *
 * For lazy-loaded app components, use APP_REGISTRY from ./registry
 * Direct imports are available here for cases where lazy loading is not needed
 */

// Registry and types
export { APP_REGISTRY, getAppById } from './registry';
export type { AppConfig } from './registry';

// Direct component exports (use sparingly - prefer lazy loading via registry)
export { Base64Tool } from './Base64Tool';
export { Browser } from './Browser';
export { Calculator } from './Calculator';
export { Calendar } from './Calendar';
export { Clock } from './Clock';
export { ColorPicker } from './ColorPicker';
export { HashGenerator } from './HashGenerator';
export { ImageViewer } from './ImageViewer';
export { JsonViewer } from './JsonViewer';
export { Mail } from './Mail';
export { Notepad } from './Notepad';
export { PasswordGenerator } from './PasswordGenerator';
export { QrGenerator } from './QrGenerator';
export { RecycleBin } from './RecycleBin';
export { Settings } from './Settings';
export { Spreadsheet } from './Spreadsheet';
export { SystemInfo } from './SystemInfo';
export { Terminal } from './Terminal';
export { ThisPC } from './ThisPC';
export { Timer } from './Timer';
export { TodoList } from './TodoList';
export { UnitConverter } from './UnitConverter';
export { Weather } from './Weather';
export { WordCounter } from './WordCounter';
