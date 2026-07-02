from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
import datetime
from backend.app.db.session import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String, nullable=False, unique=True)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    repositories = relationship("Repository", back_populates="user", cascade="all, delete-orphan")
    chats = relationship("ChatHistory", back_populates="user", cascade="all, delete-orphan")

class Repository(Base):
    __tablename__ = "repositories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    repo_name = Column(String, nullable=False)
    repo_url = Column(String, nullable=False)
    language = Column(String, nullable=False)
    status = Column(String, default="Indexing", nullable=False) # 'Indexing', 'Indexed', 'Failed'
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    user = relationship("User", back_populates="repositories")
    analyses = relationship("Analysis", back_populates="repository", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="repository", cascade="all, delete-orphan")
    embeddings = relationship("RepoEmbedding", back_populates="repository", cascade="all, delete-orphan")
    chats = relationship("ChatHistory", back_populates="repository", cascade="all, delete-orphan")

class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    repo_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    analysis_type = Column(String, nullable=False)
    status = Column(String, default="pending", nullable=False) # 'pending', 'processing', 'completed', 'failed'
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    repository = relationship("Repository", back_populates="analyses")

class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    repo_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question = Column(String, nullable=False)
    response = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    repository = relationship("Repository", back_populates="chats")
    user = relationship("User", back_populates="chats")

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    repo_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    complexity_score = Column(Integer, nullable=False)
    security_score = Column(Integer, nullable=False)
    tech_debt_score = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    repository = relationship("Repository", back_populates="reports")

class RepoEmbedding(Base):
    __tablename__ = "repo_embeddings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    repo_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    chunk_content = Column(String, nullable=False)
    embedding = Column(Vector(1536), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    repository = relationship("Repository", back_populates="embeddings")

from sqlalchemy.dialects.postgresql import JSONB

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String, nullable=False)
    repo_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=True)
    details = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

class Billing(Base):
    __tablename__ = "billing"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan = Column(String, default="Starter", nullable=False)
    subscription_status = Column(String, default="active", nullable=False)
    razorpay_payment_id = Column(String, nullable=True)
    razorpay_order_id = Column(String, nullable=True)
    amount = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

class Integration(Base):
    __tablename__ = "integrations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String, nullable=False) # 'github', 'vercel', 'netlify', etc.
    token = Column(String, nullable=False)
    status = Column(String, default="active", nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

class AgentTask(Base):
    __tablename__ = "agent_tasks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    repo_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    prompt = Column(String, nullable=False)
    branch_name = Column(String, nullable=True)
    deployment_target = Column(String, default="vercel", nullable=True)
    status = Column(String, default="Ingestion", nullable=False)
    task_list = Column(JSONB, nullable=True)
    affected_files = Column(JSONB, nullable=True)
    code_diff = Column(String, nullable=True)
    validation_report = Column(JSONB, nullable=True)
    pr_url = Column(String, nullable=True)
    deployment_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

