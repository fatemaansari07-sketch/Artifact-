"use client";

import { useState } from "react";
import ProjectList from "./ProjectList";
import BuildConsole from "./BuildConsole";
import { STARTER_FILES, STARTER_DEPS } from "../lib/starterFiles";

export default function AppShell() {
  const [view, setView] = useState("list"); // list | build
  const [activeProject, setActiveProject] = useState(null);

  function handleNew() {
    setActiveProject({
      id: null,
      name: "",
      files: STARTER_FILES,
      dependencies: STARTER_DEPS,
    });
    setView("build");
  }

  function handleOpen(project) {
    setActiveProject({
      id: project.id,
      name: project.name,
      files: project.files || STARTER_FILES,
      dependencies: project.dependencies || STARTER_DEPS,
    });
    setView("build");
  }

  if (view === "list") {
    return <ProjectList onNew={handleNew} onOpen={handleOpen} />;
  }

  return (
    <BuildConsole
      key={activeProject?.id || "new"}
      initialProjectId={activeProject?.id || null}
      initialName={activeProject?.name || ""}
      initialFiles={activeProject?.files || STARTER_FILES}
      initialDependencies={activeProject?.dependencies || STARTER_DEPS}
      onBack={() => setView("list")}
    />
  );
}
