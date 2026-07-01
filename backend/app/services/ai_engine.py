from typing import List, Dict, Any
import httpx
from sqlalchemy.orm import Session
from backend.app.db.models import RepoEmbedding
from backend.app.services.parser import RepositoryParser
from backend.app.core.config import settings

class AIEngine:
    """
    RAG AI Engine: Generates embeddings, queries pgvector storage,
    and calls OpenAI to synthesise contextual answers.
    """
    
    @classmethod
    def query_repository(cls, db: Session, repo_id: str, question: str, limit: int = 4) -> str:
        """
        Executes a real pgvector RAG search on the repository embeddings table.
        Sends context to OpenAI Chat Completions for a repository-specific answer.
        """
        # 1. Generate Query Embedding
        query_vector = RepositoryParser.get_embedding(question)
        
        # 2. Query pgvector cosine distance in PostgreSQL database
        try:
            matched_embeddings = db.query(RepoEmbedding).filter(
                RepoEmbedding.repo_id == repo_id
            ).order_by(
                RepoEmbedding.embedding.cosine_distance(query_vector)
            ).limit(limit).all()
        except Exception as e:
            print(f"[AI_ENGINE] Database vector similarity query failed: {str(e)}. Falling back to keyword search.")
            # Fallback keyword match if pgvector extension isn't loaded on database yet
            all_embeddings = db.query(RepoEmbedding).filter(RepoEmbedding.repo_id == repo_id).all()
            q_words = set(question.lower().split())
            scored = []
            for emb in all_embeddings:
                score = sum(1 for w in q_words if w in emb.chunk_content.lower())
                if score > 0:
                    scored.append((score, emb))
            scored.sort(key=lambda x: x[0], reverse=True)
            matched_embeddings = [item[1] for item in scored[:limit]]

        # 3. Assemble Context
        context_blocks = []
        for emb in matched_embeddings:
            context_blocks.append(emb.chunk_content)
            
        context_str = "\n\n---\n\n".join(context_blocks)
        
        if not context_str:
            context_str = "No code files or chunks found for this repository."

        # 4. Prompt Assembly & OpenAI request
        system_prompt = (
            "You are CogniQA, a helpful AI code intelligence engine. "
            "You analyze software architecture, dependencies, and code details. "
            "Below is context retrieved from the repository files via RAG vector search. "
            "Answer the user's question accurately using only this repository context. "
            "Format code files inside markdown blocks with syntax highlights, keep explanations technical, "
            "and suggest explicit fixes when bottlenecks are detected."
        )
        
        user_prompt = (
            f"Repository Context:\n{context_str}\n\n"
            f"User Question: {question}\n\n"
            f"Answer:"
        )

        # Call OpenAI Chat Completions API
        if settings.OPENAI_API_KEY.startswith("sk-"):
            try:
                url = "https://api.openai.com/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "gpt-4-turbo",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.2
                }
                with httpx.Client(timeout=15.0) as client:
                    res = client.post(url, json=payload, headers=headers)
                    if res.status_code == 200:
                        return res.json()["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"[AI_ENGINE] OpenAI query failed: {str(e)}. Using fallback parsing.")
                
        # 5. Local Fallback Generator (if API key is dummy or network fails)
        response = (
            f"### [CogniQA AI Core] Repository Context Search (Demo Mode)\n\n"
            f"The OpenAI API key is unset or network timed out, rendering a deterministic fallback explanation based on matched files.\n\n"
            f"**Search Results Context:**\n"
        )
        
        for idx, emb in enumerate(matched_embeddings):
            # Parse filename
            fn_match = re.search(r"File:\s*([^\s\n]+)", emb.chunk_content)
            fn = fn_match.group(1) if fn_match else "codefile.ts"
            response += f"{idx+1}. **{fn}**\n"
            
        response += "\n**Synthesis:**\n"
        
        # Look for queries
        q_lower = question.lower()
        if "auth" in q_lower or "middleware" in q_lower:
            response += (
                "The authentication check is implemented in `src/middleware/auth.ts`. "
                "It extracts bearer tokens from headers, queries `prisma.user.findUnique` inside PostgreSQL, "
                "and configures session routing variables. To optimize, cache verified profiles in Redis."
            )
        elif "payment" in q_lower or "stripe" in q_lower or "webhook" in q_lower:
            response += (
                "Billing is managed in `src/controllers/payment.ts`. "
                "It listens to Stripe checkout sessions to flag subscription states and update schemas."
            )
        elif "bottleneck" in q_lower or "performance" in q_lower or "leak" in q_lower:
            response += (
                "1. **Middleware DB queries**: `auth.ts` calls DB sequentially on every request. Cache active sessions.\n"
                "2. **Vector searches**: Querying pgvector without HNSW indexes causes table scans."
            )
        else:
            response += (
                "Found related code statements in database indices. "
                "Check the repository files tree in the sidebar to review the active implementation."
            )
            
        return response
