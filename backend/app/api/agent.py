from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict
import uuid
import time
import json
from sqlalchemy.orm import Session
from backend.app.core.security import verify_token, rate_limit_check
from backend.app.db.session import get_db
from backend.app.db.models import AgentTask, Repository, ActivityLog

router = APIRouter()

class AgentRunRequest(BaseModel):
    repository_id: uuid.UUID
    prompt: str
    deployment_target: Optional[str] = "vercel"

@router.get("/tasks/{repo_id}", tags=["AI Agent Console"])
async def list_agent_tasks(repo_id: uuid.UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    tasks = db.query(AgentTask).filter(
        AgentTask.repo_id == repo_id,
        AgentTask.user_id == user_uuid
    ).order_by(AgentTask.created_at.desc()).all()
    
    return tasks

@router.get("/status/{task_id}", tags=["AI Agent Console"])
async def get_agent_task_status(task_id: uuid.UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    task = db.query(AgentTask).filter(
        AgentTask.id == task_id,
        AgentTask.user_id == user_uuid
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Agent workflow task not found")
        
    return task

def run_agent_workflow_background(task_id: uuid.UUID, db_session_factory):
    # Retrieve DB session inside background thread
    db: Session = db_session_factory()
    try:
        task = db.query(AgentTask).filter(AgentTask.id == task_id).first()
        if not task:
            return
            
        repo = db.query(Repository).filter(Repository.id == task.repo_id).first()
        if not repo:
            task.status = "Failed"
            task.error_message = "Repository reference lost"
            db.commit()
            return

        # Helper to update task and commit
        def update_task_state(status_str: str, task_list: List[Dict], affected_files: List[str] = None, diff: str = None, val: Dict = None, pr: str = None):
            task.status = status_str
            task.task_list = task_list
            if affected_files is not None:
                task.affected_files = affected_files
            if diff is not None:
                task.code_diff = diff
            if val is not None:
                task.validation_report = val
            if pr is not None:
                task.pr_url = pr
            db.commit()
            time.sleep(2.5) # Allow frontend to poll nicely and render transitions

        tasks_checklist = [
            {"name": "Ingest Repository", "status": "pending"},
            {"name": "Analyze User Prompt", "status": "pending"},
            {"name": "Identify Affected Files", "status": "pending"},
            {"name": "Generate Code Changes", "status": "pending"},
            {"name": "Run Lints & Build Tests", "status": "pending"},
            {"name": "Create Git Commit & Branch", "status": "pending"},
            {"name": "Register Pull Request", "status": "pending"},
            {"name": "Deploy Application", "status": "pending"}
        ]

        # 1. Ingestion
        tasks_checklist[0]["status"] = "running"
        update_task_state("Ingestion", tasks_checklist)
        
        tasks_checklist[0]["status"] = "completed"
        tasks_checklist[1]["status"] = "running"
        update_task_state("PromptAnalysis", tasks_checklist)

        # 2. Prompt Analysis & Affected files
        prompt_lower = task.prompt.lower()
        affected = []
        diff_code = ""
        pr_title = "feature: implement update"
        pr_desc = "AI generated pull request."

        if "dark mode" in prompt_lower:
            affected = ["src/app/globals.css", "src/components/ThemeToggle.tsx"]
            diff_code = (
                "diff --git a/src/app/globals.css b/src/app/globals.css\n"
                "--- a/src/app/globals.css\n"
                "+++ b/src/app/globals.css\n"
                "@@ -3,4 +3,10 @@\n"
                " :root {\n"
                "   --background: #050505;\n"
                "+  --foreground: #f4f4f5;\n"
                "+}\n"
                "+@media (prefers-color-scheme: dark) {\n"
                "+  :root {\n"
                "+    --background: #000000;\n"
                "+  }\n"
                " }\n"
            )
            pr_title = "feat: add premium dark mode theme presets"
            pr_desc = "Closes requested prompt: Add dark mode support. Adds Tailwind standard class overrides."
        elif "stripe" in prompt_lower or "billing" in prompt_lower:
            affected = ["src/app/api/checkout/route.ts", "src/components/BillingForm.tsx"]
            diff_code = (
                "diff --git a/src/app/api/checkout/route.ts b/src/app/api/checkout/route.ts\n"
                "new file mode 100644\n"
                "--- /dev/null\n"
                "+++ b/src/app/api/checkout/route.ts\n"
                "@@ -0,0 +1,12 @@\n"
                "+import Stripe from 'stripe';\n"
                "+const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);\n"
                "+export async function POST(req: Request) {\n"
                "+  const session = await stripe.checkout.sessions.create({ ... });\n"
                "+  return Response.json({ id: session.id });\n"
                "+}\n"
            )
            pr_title = "feat: integrate enterprise Stripe subscription checkout flow"
            pr_desc = "Closes requested prompt: Add Stripe billing. Creates Stripe webhook hooks."
        elif "oauth" in prompt_lower or "login" in prompt_lower or "auth" in prompt_lower:
            affected = ["src/middleware.ts", "src/app/login/LoginClient.tsx"]
            diff_code = (
                "diff --git a/src/app/login/LoginClient.tsx b/src/app/login/LoginClient.tsx\n"
                "--- a/src/app/login/LoginClient.tsx\n"
                "+++ b/src/app/login/LoginClient.tsx\n"
                "@@ -55,4 +55,10 @@\n"
                "   const handleGithubLogin = async () => {\n"
                "+    await supabase.auth.signInWithOAuth({\n"
                "+      provider: 'github',\n"
                "+      options: { redirectTo: '/auth/callback' }\n"
                "+    });\n"
                "   }\n"
            )
            pr_title = "feat: implement GitHub OAuth authentication"
            pr_desc = "Closes requested prompt: Add GitHub OAuth. Sets callback redirects."
        else:
            affected = ["src/app/dashboard/DashboardClient.tsx"]
            diff_code = (
                "diff --git a/src/app/dashboard/DashboardClient.tsx b/src/app/dashboard/DashboardClient.tsx\n"
                "--- a/src/app/dashboard/DashboardClient.tsx\n"
                "+++ b/src/app/dashboard/DashboardClient.tsx\n"
                "@@ -10,3 +10,4 @@\n"
                "   const system = 'online';\n"
                "+  console.log('AI Engineering Agent active telemetry index');\n"
            )
            pr_title = "perf: optimize dashboard UI telemetry loops"
            pr_desc = f"Closes requested prompt: {task.prompt}."

        tasks_checklist[1]["status"] = "completed"
        tasks_checklist[2]["status"] = "running"
        update_task_state("CodeIntelligence", tasks_checklist, affected_files=affected)

        # 3. Code Generation
        tasks_checklist[2]["status"] = "completed"
        tasks_checklist[3]["status"] = "running"
        update_task_state("CodeGeneration", tasks_checklist, diff=diff_code)

        # 4. Validation
        tasks_checklist[3]["status"] = "completed"
        tasks_checklist[4]["status"] = "running"
        update_task_state("Validation", tasks_checklist)
        
        # Mocking validation report
        val_report = {
            "lint": {"status": "success", "errors": 0, "logs": "ESLint passed successfully. 0 warnings."},
            "build": {"status": "success", "logs": "Next.js compilation bundle complete. Standalone output written."},
            "test": {"status": "success", "passed": 8, "failed": 0, "logs": "All AST tests passed."}
        }
        
        tasks_checklist[4]["status"] = "completed"
        tasks_checklist[5]["status"] = "running"
        update_task_state("GitOperations", tasks_checklist, val=val_report)

        # 5. Git Operations
        branch_name = f"feature/agent-{task_id.hex[:6]}"
        task.branch_name = branch_name
        db.commit()
        
        tasks_checklist[5]["status"] = "completed"
        tasks_checklist[6]["status"] = "running"
        update_task_state("PullRequestGeneration", tasks_checklist)

        # 6. Pull Request Generation & Wait for user approval
        tasks_checklist[6]["status"] = "completed"
        # We stop at PendingApproval
        task.status = "PendingApproval"
        task.task_list = tasks_checklist
        task.pr_url = f"https://github.com/{repo.repo_name}/pull/{hash(task_id) % 1000}"
        db.commit()

        # Log activity
        log = ActivityLog(
            user_id=task.user_id,
            repo_id=task.repo_id,
            action="agent_task_pending",
            details=f"Agent generated PR code changes for: '{task.prompt[:40]}...'"
        )
        db.add(log)
        db.commit()

    except Exception as e:
        db.rollback()
        print(f"[AGENT_WORKFLOW] Error running background task: {str(e)}")
        # Try updating status to Failed
        try:
            task = db.query(AgentTask).filter(AgentTask.id == task_id).first()
            if task:
                task.status = "Failed"
                task.error_message = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

@router.post("/run", tags=["AI Agent Console"])
async def run_agent_task(
    payload: AgentRunRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    rate_limit_check(request, limit=10)
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    # Verify repository exists and belongs to user
    repo = db.query(Repository).filter(
        Repository.id == payload.repository_id,
        Repository.user_id == user_uuid
    ).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Connected repository not found")
        
    # Create new task
    new_task = AgentTask(
        user_id=user_uuid,
        repo_id=payload.repository_id,
        prompt=payload.prompt,
        deployment_target=payload.deployment_target,
        status="Ingestion",
        task_list=[]
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    # Log activity
    log = ActivityLog(
        user_id=user_uuid,
        repo_id=payload.repository_id,
        action="agent_task_started",
        details=f"Prompt: {payload.prompt}"
    )
    db.add(log)
    db.commit()
    
    # Bind session maker factory to pass to background thread
    from backend.app.db.session import SessionLocal
    background_tasks.add_task(
        run_agent_workflow_background,
        new_task.id,
        SessionLocal
    )
    
    return new_task

def run_deployment_workflow_background(task_id: uuid.UUID, db_session_factory):
    db: Session = db_session_factory()
    try:
        task = db.query(AgentTask).filter(AgentTask.id == task_id).first()
        if not task:
            return
            
        tasks_checklist = task.task_list
        tasks_checklist[7]["status"] = "running"
        task.status = "Deploying"
        task.task_list = tasks_checklist
        db.commit()
        
        # Simulate deployment delay
        time.sleep(4.0)
        
        target = task.deployment_target or "vercel"
        tasks_checklist[7]["status"] = "completed"
        task.status = "Completed"
        task.task_list = tasks_checklist
        task.deployment_url = f"https://cogniqa-agent-build-{task_id.hex[:6]}.{target}.app"
        
        # Log activity
        log = ActivityLog(
            user_id=task.user_id,
            repo_id=task.repo_id,
            action="agent_task_completed",
            details=f"Deployed to {target}: {task.deployment_url}"
        )
        db.add(log)
        db.commit()
        
    except Exception as e:
        db.rollback()
        task.status = "Failed"
        task.error_message = f"Deployment failed: {str(e)}"
        db.commit()
    finally:
        db.close()

@router.post("/approve/{task_id}", tags=["AI Agent Console"])
async def approve_agent_task(
    task_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    task = db.query(AgentTask).filter(
        AgentTask.id == task_id,
        AgentTask.user_id == user_uuid
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Agent workflow task not found")
        
    if task.status != "PendingApproval":
        raise HTTPException(status_code=400, detail=f"Task is in state {task.status}, cannot approve.")
        
    # Trigger background deploy
    from backend.app.db.session import SessionLocal
    background_tasks.add_task(
        run_deployment_workflow_background,
        task.id,
        SessionLocal
    )
    
    return {"message": "Task approved. Deployment triggered.", "task_id": str(task.id)}

@router.post("/reject/{task_id}", tags=["AI Agent Console"])
async def reject_agent_task(task_id: uuid.UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    user_uuid = uuid.UUID(user_id) if not user_id.startswith("usr_") else uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    task = db.query(AgentTask).filter(
        AgentTask.id == task_id,
        AgentTask.user_id == user_uuid
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Agent workflow task not found")
        
    task.status = "Failed"
    task.error_message = "Rejected by user"
    
    log = ActivityLog(
        user_id=user_uuid,
        repo_id=task.repo_id,
        action="agent_task_rejected",
        details="Agent PR code changes rejected by user"
    )
    db.add(log)
    db.commit()
    
    return {"message": "Task rejected.", "task_id": str(task.id)}
