import typer
from rich.console import Console

app = typer.Typer(
    name="cybersentry",
    help="CyberSentry — Developer-first Security Engine",
    rich_markup_mode="rich",
    no_args_is_help=True,
)
console = Console()

@app.callback()
def main():
    """CyberSentry — Attack → Detect → Explain → Fix"""
    pass

@app.command("doctor")
def cmd_doctor():
    """Check your CyberSentry installation."""
    import sys
    console.print(f"[bold green]✔[/bold green]  Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    console.print(f"[bold green]✔[/bold green]  CyberSentry is installed!")

@app.command("scan")
def cmd_scan(path: str = typer.Argument(".", help="Path to scan")):
    """Scan a project for security issues."""
    console.print(f"[cyan]Scanning:[/cyan] {path}")

@app.command("rules")
def cmd_rules():
    """List all detection rules."""
    console.print("[bold]Rules command — paste full engine code to activate.[/bold]")

if __name__ == "__main__":
    app()
