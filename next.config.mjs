/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep pdfkit as a server external so bundled lambdas include its data files (fonts)
    serverExternalPackages: ["pdfkit"],
  },
};

export default nextConfig;
