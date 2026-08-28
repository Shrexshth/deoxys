from mcp.server.fastmcp import FastMCP
import subprocess
import os
import shutil

# We name our server. This will be recognized by the TypeScript engine.
mcp = FastMCP("DeoxysFortKnox")

@mcp.tool()
def run_local_bash(command: str) -> str:
    """
    Runs a bash command securely inside an ephemeral Docker container.
    This prevents the AI from destroying the host macOS system.
    """
    # Find Docker path to fix background process PATH issues on Mac
    docker_path = shutil.which("docker")
    if not docker_path:
        if os.path.exists("/usr/local/bin/docker"):
            docker_path = "/usr/local/bin/docker"
        elif os.path.exists("/opt/homebrew/bin/docker"):
            docker_path = "/opt/homebrew/bin/docker"
        else:
            return "CRITICAL ERROR: Docker executable not found! Make sure Docker Desktop is open."

    # Get the current TrueForge directory to mount it into the container
    workspace_dir = os.getcwd()
    
    # The ultimate CTO sandbox: 
    # --rm: Destroy container instantly after running
    # -v: Map our local code into the container
    # python:3.11-slim: A tiny, fast, disposable Linux environment
    docker_cmd = [
        docker_path, "run", "--rm",
        "-v", f"{workspace_dir}:/workspace",
        "-w", "/workspace",
        "python:3.11-slim",
        "bash", "-c", command
    ]
    
    try:
        # Run it and capture the output (max 30 seconds to prevent infinite loops)
        result = subprocess.run(docker_cmd, capture_output=True, text=True, timeout=30)
        
        output = result.stdout
        if result.stderr:
            output += f"\n[stderr]\n{result.stderr}"
            
        return output if output.strip() else "Command executed successfully with no output."
        
    except subprocess.TimeoutExpired:
        return "Error: Command timed out. The agent wrote an infinite loop!"
    except Exception as e:
        return f"CRITICAL SANDBOX ERROR: {str(e)}"

if __name__ == "__main__":
    # This command blocks the terminal and listens silently for JSON-RPC via stdin
    mcp.run()