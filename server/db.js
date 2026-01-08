import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for server-side

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials not found, falling back to JSON storage');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Database interface that works with both Supabase and JSON fallback
class SupabaseDB {
  constructor() {
    this.useSupabase = !!supabase;
    console.log(this.useSupabase ? '✅ Using Supabase database' : '📁 Using JSON file storage');
  }

  // ==================== USERS ====================
  async findUserByEmail(email) {
    if (!this.useSupabase) return this._jsonFallback('findUserByEmail', email);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') console.error('Error finding user:', error);
    return data ? this._mapUserFromDB(data) : null;
  }

  async findUserByCredentials(email, password) {
    if (!this.useSupabase) return this._jsonFallback('findUserByCredentials', email, password);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error && error.code !== 'PGRST116') console.error('Error finding user:', error);
    return data ? this._mapUserFromDB(data) : null;
  }

  async getAllUsers() {
    if (!this.useSupabase) return this._jsonFallback('getAllUsers');

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, university, school, purpose, role, is_pro, created_at')
      .order('created_at', { ascending: false });

    if (error) console.error('Error getting users:', error);
    return (data || []).map(u => this._mapUserFromDB(u));
  }

  async createUser(user) {
    if (!this.useSupabase) return this._jsonFallback('createUser', user);

    const dbUser = {
      name: user.name,
      email: user.email,
      password: user.password,
      university: user.university,
      school: user.school,
      purpose: user.purpose,
      role: user.role || 'USER',
      is_pro: user.isPro || false
    };

    const { data, error } = await supabase
      .from('users')
      .insert(dbUser)
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw new Error(error.message);
    }
    return this._mapUserFromDB(data);
  }

  async updateUser(id, updates) {
    if (!this.useSupabase) return this._jsonFallback('updateUser', id, updates);

    const dbUpdates = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.university) dbUpdates.university = updates.university;
    if (updates.school) dbUpdates.school = updates.school;
    if (updates.isPro !== undefined) dbUpdates.is_pro = updates.isPro;
    if (updates.role) dbUpdates.role = updates.role;

    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) console.error('Error updating user:', error);
    return data ? this._mapUserFromDB(data) : null;
  }

  async deleteUser(id) {
    if (!this.useSupabase) return this._jsonFallback('deleteUser', id);

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) console.error('Error deleting user:', error);
    return !error;
  }

  // ==================== PROJECTS ====================
  async getAllProjects() {
    if (!this.useSupabase) return this._jsonFallback('getAllProjects');

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error getting projects:', error);
    return (data || []).map(p => this._mapProjectFromDB(p));
  }

  async getProjectsByUserId(userId) {
    if (!this.useSupabase) return this._jsonFallback('getProjectsByUserId', userId);

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) console.error('Error getting user projects:', error);
    return (data || []).map(p => this._mapProjectFromDB(p));
  }

  async getProjectById(id) {
    if (!this.useSupabase) return this._jsonFallback('getProjectById', id);

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') console.error('Error getting project:', error);
    return data ? this._mapProjectFromDB(data) : null;
  }

  async createProject(project) {
    if (!this.useSupabase) return this._jsonFallback('createProject', project);

    const dbProject = {
      name: project.name,
      paper_name: project.paperName,
      analysis: project.analysis,
      user_id: project.userId
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(dbProject)
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      throw new Error(error.message);
    }
    return this._mapProjectFromDB(data);
  }

  async updateProject(id, updates) {
    if (!this.useSupabase) return this._jsonFallback('updateProject', id, updates);

    const dbUpdates = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.analysis) dbUpdates.analysis = updates.analysis;

    const { data, error } = await supabase
      .from('projects')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) console.error('Error updating project:', error);
    return data ? this._mapProjectFromDB(data) : null;
  }

  async deleteProject(id) {
    if (!this.useSupabase) return this._jsonFallback('deleteProject', id);

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) console.error('Error deleting project:', error);
    return !error;
  }

  // ==================== REPOSITORY ====================
  async getAllRepository() {
    if (!this.useSupabase) return this._jsonFallback('getAllRepository');

    const { data, error } = await supabase
      .from('repository')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error getting repository:', error);
    return (data || []).map(r => this._mapRepoFromDB(r));
  }

  async addToRepository(entry) {
    if (!this.useSupabase) return this._jsonFallback('addToRepository', entry);

    const dbEntry = {
      paper_name: entry.paperName,
      method: entry.method,
      application: entry.application,
      fuzzy_system: entry.fuzzySystem,
      number_set: entry.numberSet,
      logic_module: entry.logicModule,
      user_id: entry.userId
    };

    const { data, error } = await supabase
      .from('repository')
      .insert(dbEntry)
      .select()
      .single();

    if (error) {
      console.error('Error adding to repository:', error);
      throw new Error(error.message);
    }
    return this._mapRepoFromDB(data);
  }

  async deleteFromRepository(id) {
    if (!this.useSupabase) return this._jsonFallback('deleteFromRepository', id);

    const { error } = await supabase
      .from('repository')
      .delete()
      .eq('id', id);

    if (error) console.error('Error deleting from repository:', error);
    return !error;
  }

  // ==================== MAPPING HELPERS ====================
  _mapUserFromDB(dbUser) {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      password: dbUser.password,
      university: dbUser.university,
      school: dbUser.school,
      purpose: dbUser.purpose,
      role: dbUser.role,
      isPro: dbUser.is_pro,
      createdAt: new Date(dbUser.created_at).getTime()
    };
  }

  _mapProjectFromDB(dbProject) {
    return {
      id: dbProject.id,
      name: dbProject.name,
      paperName: dbProject.paper_name,
      analysis: dbProject.analysis,
      userId: dbProject.user_id,
      createdAt: new Date(dbProject.created_at).getTime()
    };
  }

  _mapRepoFromDB(dbRepo) {
    return {
      id: dbRepo.id,
      paperName: dbRepo.paper_name,
      method: dbRepo.method,
      application: dbRepo.application,
      fuzzySystem: dbRepo.fuzzy_system,
      numberSet: dbRepo.number_set,
      logicModule: dbRepo.logic_module,
      userId: dbRepo.user_id,
      timestamp: new Date(dbRepo.created_at).getTime()
    };
  }

  // ==================== JSON FALLBACK ====================
  _jsonFallback(method, ...args) {
    // Import and use the old JSON db if Supabase is not available
    console.log(`[JSON Fallback] ${method}(${args.map(a => typeof a === 'object' ? 'object' : a).join(', ')})`);

    // Return null/empty for now - in production, Supabase should always be available
    const emptyReturns = {
      findUserByEmail: null,
      findUserByCredentials: null,
      getAllUsers: [],
      createUser: args[0],
      updateUser: null,
      deleteUser: false,
      getAllProjects: [],
      getProjectsByUserId: [],
      getProjectById: null,
      createProject: args[0],
      updateProject: null,
      deleteProject: false,
      getAllRepository: [],
      addToRepository: args[0],
      deleteFromRepository: false
    };

    return emptyReturns[method];
  }
}

export function initDatabase() {
  console.log('🔧 Initializing database connection...');
}

const db = new SupabaseDB();
export default db;
