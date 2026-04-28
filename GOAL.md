# MISSION: EMAD DEV BLOG (ASTRO + TAILWIND)
Build a high-performance developer blog that features a "Projects" section for linking to GitHub repositories.

# MVP MILESTONES (INCREMENTAL)
1) Base Project Setup (Astro, Tailwind, Folder Structure)
2) Core Layout & Navbar (Includes links to Home, Blog, and GitHub)
3) Project Showcase Component (Card UI for GitHub Repo links)
4) Blog Content System (Markdown Collections)
5) Deployment Config (GitHub Actions for GitHub Pages)

# CURRENT FOCUS (UPDATE EACH CYCLE)
- Cycle 1: Initialize the Astro project. Create 'src/layouts/BaseLayout.astro' and 'src/pages/index.astro'. 
- Setup Tailwind CSS with a dark-themed 'slate' color palette.
- Ensure the Navbar has a specific link to your primary GitHub profile.

# TECHNICAL REQUIREMENTS
- Use Astro 5.x or 4.x.
- Use Tailwind CSS for all styling.
- Create a 'src/components/ProjectCard.astro' for external repository links.
- Output ONLY valid code blocks via the Worker.

# OUTPUT FORMAT
Strictly use the CREATE/UPDATE/DELETE block format defined in the system prompt.

# -------------------------
# MISSION: SPRINT 2 - GITHUB REPO INTEGRATION & SECURITY
Implement the Project Showcase system using environment variables for data fetching and secure external linking.

# MVP MILESTONES
1) Setup '.env' support and '.gitignore' for security.
2) Create 'src/data/projects.json' to store GitHub repo metadata.
3) Build 'src/components/ProjectCard.astro' with hover effects and external link icons.
4) Map the project data onto the Home page or a dedicated /projects page.

# CURRENT FOCUS (UPDATE EACH CYCLE)
- Cycle 1: Create '.env.example' and update '.gitignore' to include '.env'.
- Cycle 2: Create 'src/data/projects.json'. Use this structure: 
  [{"title": "Repo Name", "description": "...", "url": "https://github.com/.../...", "tags": ["Astro", "Tailwind"]}]
- Cycle 3: Build the 'ProjectCard.astro' component. 
  - IMPORTANT: Use 'target="_blank"' and 'rel="noopener noreferrer"' for all GitHub links.
  - Style the card with a subtle border and shadow using Tailwind 'group' hover states.

# TECHNICAL REQUIREMENTS
- Access env variables via 'import.meta.env'.
- Use the 'astro-icon' library or simple SVGs for the GitHub logo.
- Ensure the UI is fully responsive (1 column on mobile, 2-3 on desktop).

# OUTPUT FORMAT
Strictly use the CREATE/UPDATE/DELETE block format. No talk.