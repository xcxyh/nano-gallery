# Nano Gallery

<div align="center">

<img width="1400" alt="Banner" src="https://raw.githubusercontent.com/xcxyh/xcxyh.github.io/image-save/images/2024202512141848428.png?token=AKBRCVKUJ3MRLJXD5WQV4QLJH2LFI" />

<br/>

**A Premium Generative Art Gallery & Playground**

Powered by the **Nano Banana Pro (Gemini)** model.  
Explore, create, and share high-quality image generation templates.

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Contributing](#-contributing)

</div>

---

## ✨ Features

- **🎨 AI Image Generation**  
  Experience high-quality image generation powered by the advanced Nano Banana Pro (Gemini) model.

- **🖼️ Template Gallery**  
  Discover and experiment with a curated collection of community-driven prompts and artistic templates.

- **🔐 Secure Authentication**  
  Robust user management and profile system powered by Supabase Auth.

- **⚡ Modern Architecture**  
  Built with Next.js 14 and Tailwind CSS for a lightning-fast, responsive user experience.

## 🛠️ Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Auth:** [Supabase](https://supabase.com/)
- **AI Engine:** [Google Gemini API](https://ai.google.dev/)
- **Icons:** [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Google Gemini API Key
- A Supabase Project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/xcxyh/nano-gallery.git
   cd nano-gallery
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Gemini API
   GEMINI_API_KEY=your_gemini_api_key

   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) to view the application.

## 🤝 Contributing

Contributions are always welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">
  <p>Built with ❤️ using Next.js and Gemini</p>
</div>
