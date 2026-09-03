import "./globals.css";
import Providers from "../components/Providers";

export const metadata = {
  title: "BeMyBrain",
  description: "สมองอีกอันของคุณ — จดบันทึกความทรงจำอย่างเป็นระบบ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
