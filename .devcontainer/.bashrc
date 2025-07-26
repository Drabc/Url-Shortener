# Enable bash completion (so __git_ps1 is available)
if [ -f /etc/bash_completion ]; then
  . /etc/bash_completion
fi

# Source the Git prompt helper (based on the docker image)
if [ -f /usr/share/git-core/git-prompt.sh ]; then
  . /usr/share/git-core/git-prompt.sh
fi

# Customize PS1: show user@host:path (branch)
export PS1='\u@\h:\w$(__git_ps1 " (%s)")\$ '
