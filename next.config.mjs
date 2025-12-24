/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep pdfkit as a server external so bundled lambdas include its data files (fonts)
    serverExternalPackages: ["pdfkit"],
    serverComponentsExternalPackages: ["pdfkit"],
    turbo: {
      resolveAlias: {
        "pdfkit/js/data/Helvetica.afm": "./lib/pdf/fonts/Helvetica.afm",
      },
    },
  },
};

export default nextConfig;
