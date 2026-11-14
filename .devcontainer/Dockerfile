FROM node:22-bookworm

# node:22-bookworm already ships git, curl, python3 and a C++ toolchain,
# which better-sqlite3 needs if no prebuilt binary matches.
RUN apt-get update && apt-get install -y --no-install-recommends \
    jq \
    sqlite3 \
    sudo \
  && rm -rf /var/lib/apt/lists/*

# GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    > /etc/apt/sources.list.d/github-cli.list \
  && apt-get update && apt-get install -y --no-install-recommends gh \
  && rm -rf /var/lib/apt/lists/*

# Let the node user fix ownership of mounted volumes in post-create.
RUN echo "node ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/node \
  && chmod 0440 /etc/sudoers.d/node

USER node

# Claude Code
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/home/node/.local/bin:${PATH}"

# Pre-create mount targets so the volumes are owned by node, not root.
RUN mkdir -p /home/node/.claude
