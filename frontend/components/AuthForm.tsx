"use client";

import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth } from "@/firebase/client";
import { signInWithEmailAndPassword } from "firebase/auth";


import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";


import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiSignIn, apiSignUp } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";


const authFormSchema = (type : FormType) => {
    return z.object({
        name: type === 'sign-up' ? z.string().min(3) : z.string().optional(),
        email: z.string().email(),
        password: z.string().min(3)

    })
}

const AuthForm = ({type}: {type: FormType}) => {
    const router = useRouter();
    const formSchema = authFormSchema(type);
  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",

    },
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try{
        if(type === "sign-up"){

            const {name, email, password} = values;

            const userCredentials = await createUserWithEmailAndPassword(auth, email, password)
            const result = await apiSignUp({
                uid: userCredentials.user.uid,
                name: name!,
                email,
            })

            if(!result?.success){
                toast.error(result?.message)
                return;
            }
            
            // User created successfully, no need to call signInWithPopup
            // The user is already authenticated after createUserWithEmailAndPassword
            toast.success("Account created successfully!");
            router.push('/sign-in');
            return;




            toast.success("Account created successfully! Please sign in");
            router.push('/sign-in');
        } else {
            const {email, password} = values;

            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            const idToken = await userCredential.user.getIdToken();

            if(!idToken){
                toast.error("Sign in failed.");
                return;
            }

            await apiSignIn({
                email, idToken
            })


            
            toast.success("Signed in successfully!");
            router.push('/dashboard');
        }

    } catch (error) {
        console.log(error);
        toast.error(`There was an error: ${error}`)
    }
  
  }

  const isSignIn = type === "sign-in";

  return (
    <div className="card-border lg:min-w-[566px] relative">
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle />
      </div>
      <div className="flex flex-col gap-6 card py-14 px-10">
        <Link href="/" className="flex flex-row gap-2 justify-center items-center hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="Prepzi-AI logo" height={38} width={38} className="rounded-full" />

          <h2 className="text-primary-200">Prepzi-AI</h2>
        </Link>

        <h3>Practice job interview with AI</h3>
      
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6 mt-4 form">
            

            {!isSignIn && (
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Your Name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="Your email address" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter your password" type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            <Button  className="btn" type="submit">{isSignIn ? 'Sign in' : 'Create an Account'}</Button>
            </form>
        </Form>

        <p className="text-center">
            {isSignIn ? "No account yet" :"Have an Account already?"}
            <a href={!isSignIn ? "/sign-in" : "/sign-up"} className="font-bold text-user-primary ml-1">
              {!isSignIn ? "Sign in" : "Sign up"}
            </a>
        </p>
        </div>
    </div>
  );
};

export default AuthForm;
