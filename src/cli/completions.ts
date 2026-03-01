const ZSH_COMPLETION = `_ccplan_plans() {
  local plans_dir=".claude/plans"
  if [[ -d "$plans_dir" ]]; then
    local -a plans
    plans=(\${plans_dir}/*.md(N:t))
    compadd -a plans
  fi
}

_ccplan() {
  local -a commands
  commands=(
    'list:List plans'
    'status:Change plan status'
    'clean:Delete done plans'
    'open:Open plan in \\$EDITOR'
  )

  _arguments -C \\
    '(--help -h)'{--help,-h}'[Show help]' \\
    '(--version -V)'{--version,-V}'[Show version]' \\
    '1:command:->command' \\
    '*::arg:->args'

  case "$state" in
    command)
      _describe 'command' commands
      ;;
    args)
      case "\${words[1]}" in
        status)
          _arguments \\
            '(--latest -l)'{--latest,-l}'[Target most recently modified plan]' \\
            '1:plan file:_ccplan_plans' \\
            '2:status:(draft active done)'
          ;;
        open)
          _arguments \\
            '(--latest -l)'{--latest,-l}'[Open most recently modified plan]' \\
            '1:plan file:_ccplan_plans'
          ;;
        list)
          _arguments \\
            '(--status -s)'{--status,-s}'[Filter by status]:status:(draft active done)' \\
            '--json[Output as JSON]'
          ;;
        clean)
          _arguments \\
            '(--status -s)'{--status,-s}'[Filter by status]:status:(draft active done)' \\
            '(--days -d)'{--days,-d}'[Minimum days since updated]:days:' \\
            '--all[Remove day limit]' \\
            '(--latest -l)'{--latest,-l}'[Target most recently modified plan]' \\
            '--dry-run[Preview without changes]' \\
            '(--force -f)'{--force,-f}'[Skip confirmation]' \\
            '1:plan file:_ccplan_plans'
          ;;
        *)
          _ccplan_plans
          ;;
      esac
      ;;
  esac
}

compdef _ccplan ccplan`;

const BASH_COMPLETION = `_ccplan() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  commands="list status clean open"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\${commands} --help --version" -- "\${cur}") )
    return 0
  fi

  case "\${COMP_WORDS[1]}" in
    status|open)
      if [[ "\${COMP_WORDS[1]}" == "status" && \${COMP_CWORD} -eq 3 ]]; then
        COMPREPLY=( $(compgen -W "draft active done" -- "\${cur}") )
      elif [[ -d ".claude/plans" ]]; then
        local plans=$(ls .claude/plans/*.md 2>/dev/null | xargs -I{} basename {})
        COMPREPLY=( $(compgen -W "\${plans} --latest" -- "\${cur}") )
      fi
      ;;
    list)
      if [[ "\${prev}" == "--status" || "\${prev}" == "-s" ]]; then
        COMPREPLY=( $(compgen -W "draft active done" -- "\${cur}") )
      else
        COMPREPLY=( $(compgen -W "--status --json" -- "\${cur}") )
      fi
      ;;
    clean)
      if [[ "\${prev}" == "--status" || "\${prev}" == "-s" ]]; then
        COMPREPLY=( $(compgen -W "draft active done" -- "\${cur}") )
      elif [[ -d ".claude/plans" ]]; then
        local plans=$(ls .claude/plans/*.md 2>/dev/null | xargs -I{} basename {})
        COMPREPLY=( $(compgen -W "\${plans} --status --days --all --latest --dry-run --force" -- "\${cur}") )
      else
        COMPREPLY=( $(compgen -W "--status --days --all --latest --dry-run --force" -- "\${cur}") )
      fi
      ;;
  esac
}
complete -F _ccplan ccplan`;

const SUPPORTED_SHELLS = ["bash", "zsh"] as const;

type Shell = (typeof SUPPORTED_SHELLS)[number];

const COMPLETIONS: Record<Shell, string> = {
  zsh: ZSH_COMPLETION,
  bash: BASH_COMPLETION,
};

function isSupportedShell(shell: string): shell is Shell {
  return (SUPPORTED_SHELLS as readonly string[]).includes(shell);
}

export function printCompletions(shell: string): void {
  if (isSupportedShell(shell)) {
    console.log(COMPLETIONS[shell]);
    return;
  }

  console.error(
    `Unsupported shell: ${shell}\nSupported: ${SUPPORTED_SHELLS.join(", ")}`,
  );
  process.exitCode = 1;
}
