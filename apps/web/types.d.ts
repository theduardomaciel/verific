// Este arquivo permite que o TypeScript reconheça arquivos CSS como módulos, 
// como no componente place-picker.tsx
declare module '*.css' {
    const content: string;
    export default content;
}