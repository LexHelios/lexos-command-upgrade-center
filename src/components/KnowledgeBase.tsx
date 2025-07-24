import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Tag,
  Edit,
  Trash2,
  Star,
  Clock,
  Brain,
  Lightbulb,
  FileText,
  Bookmark,
  TrendingUp,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: string;
  title: string;
  content: string;
  category: 'idea' | 'learning' | 'reference' | 'project' | 'personal' | 'meeting';
  tags: string[];
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  summary?: string;
  relatedNotes?: string[];
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const categories: Category[] = [
  { id: 'idea', name: 'Ideas', description: 'Creative thoughts and concepts', icon: Lightbulb, color: 'yellow' },
  { id: 'learning', name: 'Learning', description: 'Study notes and insights', icon: BookOpen, color: 'blue' },
  { id: 'reference', name: 'Reference', description: 'Important information to remember', icon: Bookmark, color: 'green' },
  { id: 'project', name: 'Projects', description: 'Project-related notes and plans', icon: TrendingUp, color: 'purple' },
  { id: 'personal', name: 'Personal', description: 'Personal thoughts and reflections', icon: FileText, color: 'pink' },
  { id: 'meeting', name: 'Meetings', description: 'Meeting notes and action items', icon: Clock, color: 'orange' }
];

export const KnowledgeBase = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    category: 'idea' as const,
    tags: [] as string[],
    tagInput: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    // Load notes from localStorage
    const savedNotes = localStorage.getItem('lexos-knowledge-base');
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes);
      setNotes(parsedNotes.map((note: Note) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt)
      })));
    }
  }, []);

  const saveNotes = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('lexos-knowledge-base', JSON.stringify(updatedNotes));
  };

  const addNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) {
      toast({
        title: "Error",
        description: "Please enter both title and content",
        variant: "destructive",
      });
      return;
    }

    const note: Note = {
      id: Date.now().toString(),
      title: newNote.title,
      content: newNote.content,
      category: newNote.category,
      tags: newNote.tags,
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      summary: generateSummary(newNote.content)
    };

    saveNotes([note, ...notes]);
    resetForm();
    setShowAddForm(false);

    toast({
      title: "Note Added",
      description: `"${note.title}" has been added to your knowledge base`,
    });
  };

  const updateNote = () => {
    if (!editingNote) return;

    const updatedNotes = notes.map(note =>
      note.id === editingNote.id 
        ? { ...editingNote, updatedAt: new Date(), summary: generateSummary(editingNote.content) }
        : note
    );
    
    saveNotes(updatedNotes);
    setEditingNote(null);

    toast({
      title: "Note Updated",
      description: "Your note has been saved",
    });
  };

  const deleteNote = (noteId: string) => {
    const updatedNotes = notes.filter(note => note.id !== noteId);
    saveNotes(updatedNotes);
    
    toast({
      title: "Note Deleted",
      description: "Note has been removed from your knowledge base",
    });
  };

  const toggleFavorite = (noteId: string) => {
    const updatedNotes = notes.map(note =>
      note.id === noteId ? { ...note, isFavorite: !note.isFavorite } : note
    );
    saveNotes(updatedNotes);
  };

  const generateSummary = (content: string): string => {
    // Simple summary generation - take first 100 characters
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  };

  const addTag = (tagInput: string, isEditing: boolean = false) => {
    if (!tagInput.trim()) return;

    const tag = tagInput.trim().toLowerCase();
    
    if (isEditing && editingNote) {
      if (!editingNote.tags.includes(tag)) {
        setEditingNote({
          ...editingNote,
          tags: [...editingNote.tags, tag]
        });
      }
    } else {
      if (!newNote.tags.includes(tag)) {
        setNewNote({
          ...newNote,
          tags: [...newNote.tags, tag],
          tagInput: ''
        });
      }
    }
  };

  const removeTag = (tagToRemove: string, isEditing: boolean = false) => {
    if (isEditing && editingNote) {
      setEditingNote({
        ...editingNote,
        tags: editingNote.tags.filter(tag => tag !== tagToRemove)
      });
    } else {
      setNewNote({
        ...newNote,
        tags: newNote.tags.filter(tag => tag !== tagToRemove)
      });
    }
  };

  const resetForm = () => {
    setNewNote({
      title: '',
      content: '',
      category: 'idea',
      tags: [],
      tagInput: ''
    });
  };

  const getFilteredNotes = () => {
    let filtered = notes;

    if (selectedCategory !== 'all') {
      if (selectedCategory === 'favorites') {
        filtered = filtered.filter(note => note.isFavorite);
      } else {
        filtered = filtered.filter(note => note.category === selectedCategory);
      }
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(note =>
        selectedTags.every(tag => note.tags.includes(tag))
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  };

  const getAllTags = (): string[] => {
    const tagSet = new Set<string>();
    notes.forEach(note => note.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || categories[0];
  };

  const filteredNotes = getFilteredNotes();
  const allTags = getAllTags();
  const stats = {
    total: notes.length,
    favorites: notes.filter(n => n.isFavorite).length,
    categories: categories.map(cat => ({
      ...cat,
      count: notes.filter(n => n.category === cat.id).length
    }))
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Knowledge Base
          </h2>
          <p className="text-muted-foreground">Your personal wiki and note-taking system</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Notes</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.favorites}</p>
                <p className="text-sm text-muted-foreground">Favorites</p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{allTags.length}</p>
                <p className="text-sm text-muted-foreground">Unique Tags</p>
              </div>
              <Tag className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="search">Advanced Search</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notes</SelectItem>
                <SelectItem value="favorites">Favorites</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <Label>Filter by tags:</Label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (selectedTags.includes(tag)) {
                        setSelectedTags(selectedTags.filter(t => t !== tag));
                      } else {
                        setSelectedTags([...selectedTags, tag]);
                      }
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Add/Edit Note Form */}
          {(showAddForm || editingNote) && (
            <Card>
              <CardHeader>
                <CardTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editingNote ? editingNote.title : newNote.title}
                    onChange={(e) => editingNote 
                      ? setEditingNote({ ...editingNote, title: e.target.value })
                      : setNewNote({ ...newNote, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={editingNote ? editingNote.category : newNote.category} 
                    onValueChange={(value: 'idea' | 'learning' | 'reference' | 'project' | 'personal' | 'meeting') => editingNote 
                      ? setEditingNote({ ...editingNote, category: value })
                      : setNewNote({ ...newNote, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    rows={8}
                    value={editingNote ? editingNote.content : newNote.content}
                    onChange={(e) => editingNote 
                      ? setEditingNote({ ...editingNote, content: e.target.value })
                      : setNewNote({ ...newNote, content: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag..."
                      value={editingNote ? '' : newNote.tagInput}
                      onChange={(e) => !editingNote && setNewNote({ ...newNote, tagInput: e.target.value })}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(editingNote ? (e.target as HTMLInputElement).value : newNote.tagInput, !!editingNote);
                          if (!editingNote) {
                            setNewNote({ ...newNote, tagInput: '' });
                          } else {
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="Add tag..."]') as HTMLInputElement;
                        if (input?.value) {
                          addTag(input.value, !!editingNote);
                          input.value = '';
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(editingNote ? editingNote.tags : newNote.tags).map(tag => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer">
                        {tag}
                        <button
                          onClick={() => removeTag(tag, !!editingNote)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={editingNote ? updateNote : addNote}>
                    {editingNote ? 'Update Note' : 'Add Note'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingNote(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes List */}
          <div className="grid gap-4">
            {filteredNotes.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No notes found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || selectedCategory !== 'all' || selectedTags.length > 0
                      ? 'Try adjusting your search or filters'
                      : 'Start building your knowledge base by adding your first note'
                    }
                  </p>
                  {!searchQuery && selectedCategory === 'all' && selectedTags.length === 0 && (
                    <Button onClick={() => setShowAddForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredNotes.map((note) => {
                const categoryInfo = getCategoryInfo(note.category);
                const CategoryIcon = categoryInfo.icon;
                
                return (
                  <Card key={note.id} className="animate-fade-in">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CategoryIcon className="h-5 w-5" />
                          <div>
                            <CardTitle className="text-lg">{note.title}</CardTitle>
                            <CardDescription>
                              {format(note.updatedAt, 'MMM dd, yyyy')} • {categoryInfo.name}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {note.isFavorite && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(note.id)}
                          >
                            <Star className={`h-4 w-4 ${note.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingNote(note)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNote(note.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{note.summary}</p>
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {note.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.categories.map(category => {
              const CategoryIcon = category.icon;
              return (
                <Card key={category.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CategoryIcon className="h-8 w-8" />
                      <div>
                        <h3 className="font-semibold">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{category.count} notes</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        View Notes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Search</CardTitle>
              <CardDescription>
                Use advanced filters to find exactly what you're looking for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Search in content</Label>
                  <Input placeholder="Search note content..." />
                </div>
                <div className="space-y-2">
                  <Label>Date range</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This week</SelectItem>
                      <SelectItem value="month">This month</SelectItem>
                      <SelectItem value="year">This year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};