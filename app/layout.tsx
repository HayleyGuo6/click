import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'一会儿 · Click', description:'属于你的对话练习室。先说出来，再看见更多回应的可能。', icons:{icon:'/favicon.svg'} };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="zh-CN"><body>{children}</body></html>; }
