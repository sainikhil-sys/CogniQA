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
