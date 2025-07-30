#!/usr/bin/env bash

# Copy SSH keys to allow git ssh access
cp -r /ssh-readonly/* ~/.ssh \
  && chmod 700 ~/.ssh \
  && chmod -R 600 ~/.ssh/id_* \
  && chmod 644 ~/.ssh/id*.pub \
  && echo 'SSH keys copied and permissions set.';

# Ensure .bashrc is sourced in .bash_profile for login shells
echo 'source ~/.bashrc' >> ~/.bash_profile && echo "Initialized bash_profile"
