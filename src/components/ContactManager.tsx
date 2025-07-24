import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin,
  Briefcase,
  User,
  Star,
  Edit,
  Trash2,
  Calendar,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  address?: string;
  notes?: string;
  category: 'personal' | 'business' | 'family' | 'colleague' | 'client';
  isFavorite: boolean;
  tags: string[];
  avatar?: string;
  lastContact?: Date;
  createdAt: Date;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
}

export const ContactManager = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    address: '',
    notes: '',
    category: 'personal' as const,
    tags: [] as string[],
    socialMedia: {
      linkedin: '',
      twitter: '',
      website: ''
    }
  });
  const { toast } = useToast();

  useEffect(() => {
    // Load contacts from localStorage
    const savedContacts = localStorage.getItem('lexos-contacts');
    if (savedContacts) {
      const parsedContacts = JSON.parse(savedContacts);
      setContacts(parsedContacts.map((contact: Contact) => ({
        ...contact,
        createdAt: new Date(contact.createdAt),
        lastContact: contact.lastContact ? new Date(contact.lastContact) : undefined
      })));
    }
  }, []);

  const saveContacts = (updatedContacts: Contact[]) => {
    setContacts(updatedContacts);
    localStorage.setItem('lexos-contacts', JSON.stringify(updatedContacts));
  };

  const addContact = () => {
    if (!newContact.name.trim() || !newContact.email.trim()) {
      toast({
        title: "Error",
        description: "Please enter at least a name and email",
        variant: "destructive",
      });
      return;
    }

    const contact: Contact = {
      id: Date.now().toString(),
      name: newContact.name,
      email: newContact.email,
      phone: newContact.phone,
      company: newContact.company,
      position: newContact.position,
      address: newContact.address,
      notes: newContact.notes,
      category: newContact.category,
      isFavorite: false,
      tags: newContact.tags,
      createdAt: new Date(),
      socialMedia: newContact.socialMedia
    };

    saveContacts([contact, ...contacts]);
    resetForm();
    setShowAddForm(false);

    toast({
      title: "Contact Added",
      description: `${contact.name} has been added to your contacts`,
    });
  };

  const updateContact = () => {
    if (!editingContact) return;

    const updatedContacts = contacts.map(contact =>
      contact.id === editingContact.id ? { ...editingContact } : contact
    );
    
    saveContacts(updatedContacts);
    setEditingContact(null);

    toast({
      title: "Contact Updated",
      description: "Contact information has been saved",
    });
  };

  const deleteContact = (contactId: string) => {
    const updatedContacts = contacts.filter(contact => contact.id !== contactId);
    saveContacts(updatedContacts);
    
    toast({
      title: "Contact Deleted",
      description: "Contact has been removed from your list",
    });
  };

  const toggleFavorite = (contactId: string) => {
    const updatedContacts = contacts.map(contact =>
      contact.id === contactId ? { ...contact, isFavorite: !contact.isFavorite } : contact
    );
    saveContacts(updatedContacts);
  };

  const resetForm = () => {
    setNewContact({
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      address: '',
      notes: '',
      category: 'personal',
      tags: [],
      socialMedia: {
        linkedin: '',
        twitter: '',
        website: ''
      }
    });
  };

  const getFilteredContacts = () => {
    let filtered = contacts;

    if (selectedCategory !== 'all') {
      if (selectedCategory === 'favorites') {
        filtered = filtered.filter(contact => contact.isFavorite);
      } else {
        filtered = filtered.filter(contact => contact.category === selectedCategory);
      }
    }

    if (searchQuery) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'business': return <Briefcase className="h-4 w-4" />;
      case 'family': return <Users className="h-4 w-4" />;
      case 'colleague': return <User className="h-4 w-4" />;
      case 'client': return <Star className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const filteredContacts = getFilteredContacts();
  const stats = {
    total: contacts.length,
    business: contacts.filter(c => c.category === 'business').length,
    personal: contacts.filter(c => c.category === 'personal').length,
    favorites: contacts.filter(c => c.isFavorite).length
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Contact Manager
          </h2>
          <p className="text-muted-foreground">Manage your personal and business contacts</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.business}</p>
                <p className="text-sm text-muted-foreground">Business</p>
              </div>
              <Briefcase className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.personal}</p>
                <p className="text-sm text-muted-foreground">Personal</p>
              </div>
              <User className="h-8 w-8 text-green-600" />
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
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contacts</SelectItem>
            <SelectItem value="favorites">Favorites</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="family">Family</SelectItem>
            <SelectItem value="colleague">Colleagues</SelectItem>
            <SelectItem value="client">Clients</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Add/Edit Contact Form */}
      {(showAddForm || editingContact) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingContact ? 'Edit Contact' : 'Add New Contact'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={editingContact ? editingContact.name : newContact.name}
                  onChange={(e) => editingContact 
                    ? setEditingContact({ ...editingContact, name: e.target.value })
                    : setNewContact({ ...newContact, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingContact ? editingContact.email : newContact.email}
                  onChange={(e) => editingContact 
                    ? setEditingContact({ ...editingContact, email: e.target.value })
                    : setNewContact({ ...newContact, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editingContact ? editingContact.phone || '' : newContact.phone}
                  onChange={(e) => editingContact 
                    ? setEditingContact({ ...editingContact, phone: e.target.value })
                    : setNewContact({ ...newContact, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={editingContact ? editingContact.category : newContact.category} 
                  onValueChange={(value: string) => editingContact 
                    ? setEditingContact({ ...editingContact, category: value })
                    : setNewContact({ ...newContact, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="colleague">Colleague</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={editingContact ? editingContact.company || '' : newContact.company}
                  onChange={(e) => editingContact 
                    ? setEditingContact({ ...editingContact, company: e.target.value })
                    : setNewContact({ ...newContact, company: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={editingContact ? editingContact.position || '' : newContact.position}
                  onChange={(e) => editingContact 
                    ? setEditingContact({ ...editingContact, position: e.target.value })
                    : setNewContact({ ...newContact, position: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={editingContact ? editingContact.address || '' : newContact.address}
                onChange={(e) => editingContact 
                  ? setEditingContact({ ...editingContact, address: e.target.value })
                  : setNewContact({ ...newContact, address: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editingContact ? editingContact.notes || '' : newContact.notes}
                onChange={(e) => editingContact 
                  ? setEditingContact({ ...editingContact, notes: e.target.value })
                  : setNewContact({ ...newContact, notes: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={editingContact ? updateContact : addContact}>
                {editingContact ? 'Update Contact' : 'Add Contact'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingContact(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacts List */}
      <div className="grid gap-4">
        {filteredContacts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No contacts found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filter'
                  : 'Add your first contact to get started'
                }
              </p>
              {!searchQuery && selectedCategory === 'all' && (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredContacts.map((contact) => (
            <Card key={contact.id} className="animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{contact.name}</h3>
                        {contact.isFavorite && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getCategoryIcon(contact.category)}
                          <span className="ml-1">{contact.category}</span>
                        </Badge>
                        {contact.company && (
                          <span className="text-sm text-muted-foreground">
                            {contact.company}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </div>
                        {contact.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </div>
                        )}
                        {contact.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {contact.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(contact.id)}
                    >
                      <Star className={`h-4 w-4 ${contact.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingContact(contact)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteContact(contact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {contact.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground">{contact.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};