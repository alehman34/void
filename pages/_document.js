import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="application-name" content="Void" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="Void" />
        <meta name="theme-color" content="#0a0a0a" />
      </Head>
      <body style={{ margin: 0, background: "#0a0a0a" }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
