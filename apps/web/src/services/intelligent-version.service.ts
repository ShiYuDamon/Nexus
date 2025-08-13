




export interface EditSession {
  id: string;
  startTime: number;
  lastEditTime: number;
  editCount: number;
  isActive: boolean;
  initialContent: string;
  currentContent: string;
  significantChanges: boolean;
}

export interface ContentChange {
  type: 'text' | 'structure' | 'format';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  timestamp: number;
}

export interface VersionCreationConfig {

  sessionTimeoutMs: number;
  minSessionDurationMs: number;


  minTextChangeRatio: number;
  minStructureChanges: number;


  versionWindowMs: number;
  maxVersionsPerWindow: number;


  debounceMs: number;
}

export class IntelligentVersionService {
  private config: VersionCreationConfig;
  private currentSession: EditSession | null = null;
  private recentVersions: Array<{timestamp: number;content: string;}> = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private sessionTimeoutTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<VersionCreationConfig>) {
    this.config = {
      sessionTimeoutMs: 45 * 1000,
      minSessionDurationMs: 10 * 1000,
      minTextChangeRatio: 0.05,
      minStructureChanges: 1,
      versionWindowMs: 5 * 60 * 1000,
      maxVersionsPerWindow: 1,
      debounceMs: 2 * 1000,
      ...config
    };
  }




  public handleContentChange(
  content: string,
  title: string,
  source: 'local' | 'remote' = 'local')
  : Promise<boolean> {
    return new Promise((resolve) => {

      if (source !== 'local') {
        resolve(false);
        return;
      }


      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }


      this.debounceTimer = setTimeout(async () => {
        const shouldCreateVersion = await this.processContentChange(content, title);
        resolve(shouldCreateVersion);
      }, this.config.debounceMs);
    });
  }




  private async processContentChange(content: string, title: string): Promise<boolean> {
    const now = Date.now();


    this.manageEditSession(content, now);


    const shouldCreate = await this.shouldCreateVersion(content, title, now);

    if (shouldCreate) {

      await this.createVersionAndUpdateState(content, title, now);
      return true;
    }

    return false;
  }




  private manageEditSession(content: string, timestamp: number): void {
    if (!this.currentSession) {

      this.startNewSession(content, timestamp);
    } else {

      this.updateCurrentSession(content, timestamp);
    }


    this.resetSessionTimeout();
  }




  private startNewSession(content: string, timestamp: number): void {
    this.currentSession = {
      id: `session_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: timestamp,
      lastEditTime: timestamp,
      editCount: 1,
      isActive: true,
      initialContent: content,
      currentContent: content,
      significantChanges: false
    };

    
  }




  private updateCurrentSession(content: string, timestamp: number): void {
    if (!this.currentSession) return;

    this.currentSession.lastEditTime = timestamp;
    this.currentSession.editCount++;
    this.currentSession.currentContent = content;


    if (!this.currentSession.significantChanges) {
      this.currentSession.significantChanges = this.hasSignificantChanges(
        this.currentSession.initialContent,
        content
      );
    }
  }




  private resetSessionTimeout(): void {
    if (this.sessionTimeoutTimer) {
      clearTimeout(this.sessionTimeoutTimer);
    }

    this.sessionTimeoutTimer = setTimeout(() => {
      this.endCurrentSession();
    }, this.config.sessionTimeoutMs);
  }




  private endCurrentSession(): void {
    if (!this.currentSession) return;

    const session = this.currentSession;
    const sessionDuration = Date.now() - session.startTime;

    


    if (
    session.significantChanges &&
    sessionDuration >= this.config.minSessionDurationMs)
    {

      
    }

    this.currentSession = null;

    if (this.sessionTimeoutTimer) {
      clearTimeout(this.sessionTimeoutTimer);
      this.sessionTimeoutTimer = null;
    }
  }




  private async shouldCreateVersion(content: string, title: string, timestamp: number): Promise<boolean> {

    if (!this.isWithinVersionWindow(timestamp)) {
      
      return false;
    }


    if (!this.hasSignificantContentChanges(content)) {
      
      return false;
    }


    if (!this.isSessionReadyForVersion()) {
      
      return false;
    }

    return true;
  }




  private isWithinVersionWindow(timestamp: number): boolean {

    this.recentVersions = this.recentVersions.filter(
      (v) => timestamp - v.timestamp <= this.config.versionWindowMs
    );


    return this.recentVersions.length < this.config.maxVersionsPerWindow;
  }




  private hasSignificantContentChanges(content: string): boolean {
    if (this.recentVersions.length === 0) {
      return true;
    }

    const lastVersion = this.recentVersions[this.recentVersions.length - 1];
    return this.hasSignificantChanges(lastVersion.content, content);
  }




  private isSessionReadyForVersion(): boolean {
    if (!this.currentSession) return false;

    const sessionDuration = Date.now() - this.currentSession.startTime;

    return (
      this.currentSession.significantChanges &&
      sessionDuration >= this.config.minSessionDurationMs &&
      this.currentSession.editCount >= 3);

  }




  private hasSignificantChanges(oldContent: string, newContent: string): boolean {
    try {
      const oldBlocks = JSON.parse(oldContent);
      const newBlocks = JSON.parse(newContent);


      const structureChanges = Math.abs(oldBlocks.length - newBlocks.length);
      if (structureChanges >= this.config.minStructureChanges) {
        return true;
      }


      const textChangeRatio = this.calculateTextChangeRatio(oldBlocks, newBlocks);
      if (textChangeRatio >= this.config.minTextChangeRatio) {
        return true;
      }


      if (this.hasBlockTypeChanges(oldBlocks, newBlocks)) {
        return true;
      }

      return false;
    } catch (error) {
      
      return true;
    }
  }




  private calculateTextChangeRatio(oldBlocks: any[], newBlocks: any[]): number {
    const oldText = this.extractTextFromBlocks(oldBlocks);
    const newText = this.extractTextFromBlocks(newBlocks);

    if (oldText.length === 0 && newText.length === 0) return 0;
    if (oldText.length === 0) return 1;


    const distance = this.calculateLevenshteinDistance(oldText, newText);
    return distance / Math.max(oldText.length, newText.length);
  }




  private extractTextFromBlocks(blocks: any[]): string {
    return blocks.
    map((block) => block.content || '').
    join(' ').
    replace(/\s+/g, ' ').
    trim();
  }




  private hasBlockTypeChanges(oldBlocks: any[], newBlocks: any[]): boolean {
    const minLength = Math.min(oldBlocks.length, newBlocks.length);

    for (let i = 0; i < minLength; i++) {
      if (oldBlocks[i].type !== newBlocks[i].type) {
        return true;
      }
    }

    return false;
  }




  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }




  private async createVersionAndUpdateState(content: string, title: string, timestamp: number): Promise<void> {

    this.recentVersions.push({
      timestamp,
      content
    });


    this.endCurrentSession();

    
  }




  public async forceCreateVersion(content: string, title: string): Promise<boolean> {
    if (this.currentSession && this.currentSession.significantChanges) {
      await this.createVersionAndUpdateState(content, title, Date.now());
      return true;
    }
    return false;
  }




  public getCurrentSessionInfo(): EditSession | null {
    return this.currentSession;
  }




  public cleanup(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.sessionTimeoutTimer) {
      clearTimeout(this.sessionTimeoutTimer);
      this.sessionTimeoutTimer = null;
    }

    this.currentSession = null;
    this.recentVersions = [];
  }
}